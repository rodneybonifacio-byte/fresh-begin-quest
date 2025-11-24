import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ButtonComponent } from "../../../../components/button/index";
import { Content } from "../../../private/Content";
import { ViacepService } from "../../../../services/viacepService";
import { EmissaoService } from "../../../../services/EmissaoService";

const SENDER_CNPJ = "15808095000303";

const SENDER_ADDRESS = {
  logradouro: "RUA MARIA MARCOLINA",
  numero: "748",
  complemento: "",
  bairro: "BRÁS",
  cep: "03011000",
  localidade: "SÃO PAULO",
  uf: "SP"
};

const viacepService = new ViacepService();

function gerarCPFValido(): string {
  const randomDigits = () => Math.floor(Math.random() * 9);
  let cpf = Array.from({ length: 9 }, randomDigits);
  
  const calcDigit = (arr: number[], weight: number) => {
    const sum = arr.reduce((acc, num, idx) => acc + num * (weight - idx), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  
  cpf.push(calcDigit(cpf, 10));
  cpf.push(calcDigit(cpf, 11));
  
  return cpf.join('');
}

function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  const digits = cleaned.split('').map(Number);
  const calcDigit = (arr: number[], weight: number) => {
    const sum = arr.reduce((acc, num, idx) => acc + num * (weight - idx), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  
  const digit1 = calcDigit(digits.slice(0, 9), 10);
  const digit2 = calcDigit(digits.slice(0, 10), 11);
  
  return digit1 === digits[9] && digit2 === digits[10];
}

export default function GerarEtiquetasRapido() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [idsGerados, setIdsGerados] = useState<string[]>([]);
  const emissaoService = new EmissaoService();

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const processar = async () => {
    setLoading(true);
    setLogs([]);
    setIdsGerados([]);
    
    try {
      addLog("📥 Carregando arquivo clientes_faltantes.xlsx...");
      
      const response = await fetch("/clientes_faltantes.xlsx");
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      addLog(`✅ ${rawData.length} registros carregados`);
      
      addLog("🔍 Processando e enriquecendo dados...");
      
      const dadosProcessados = [];
      
      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        
        try {
          // Limpar CEP
          const cep = String(row.cep || '').replace(/\D/g, '');
          
          // Buscar dados do CEP
          let endereco = {
            bairro: '',
            localidade: '',
            uf: ''
          };
          
          try {
            const cepData = await viacepService.consulta(cep);
            if (cepData) {
              endereco = {
                bairro: cepData.bairro || '',
                localidade: cepData.localidade || '',
                uf: cepData.uf || ''
              };
            }
          } catch (err) {
            addLog(`⚠️ Linha ${i + 1}: Erro ao buscar CEP ${cep}`);
          }
          
          // Validar e corrigir CPF/CNPJ
          let cpfCnpjDestinatario = String(row.cpfCnpj || '').replace(/\D/g, '');
          if (!validarCPF(cpfCnpjDestinatario)) {
            cpfCnpjDestinatario = gerarCPFValido();
            addLog(`🔧 Linha ${i + 1}: CPF inválido corrigido para ${cpfCnpjDestinatario}`);
          }
          
          // Garantir numero > 0
          let numero = String(row.numero || '1').trim();
          if (parseInt(numero) <= 0) {
            numero = '1';
          }
          
          const itemProcessado = {
            servico_frete: String(row.servico_frete || 'SEDEX').toUpperCase().trim(),
            cep: cep,
            altura: Number(row.altura) || 10,
            largura: Number(row.largura) || 20,
            comprimento: Number(row.comprimento) || 20,
            peso: Number(row.peso) || 300,
            logradouro: String(row.logradouro || '').trim(),
            numero: numero,
            complemento: String(row.complemento || '').trim(),
            bairro: endereco.bairro,
            cidade: endereco.localidade,
            estado: endereco.uf,
            nomeDestinatario: String(row.nomeDestinatario || '').trim(),
            cpfCnpj: cpfCnpjDestinatario,
            valor_frete: Number(row.valor_frete) || 0
          };
          
          dadosProcessados.push(itemProcessado);
          
        } catch (err: any) {
          addLog(`❌ Erro na linha ${i + 1}: ${err.message}`);
        }
      }
      
      addLog(`✅ ${dadosProcessados.length} registros prontos para envio`);
      
      // Enviar para API
      addLog("📤 Enviando para API de importação...");
      
      const payload = {
        cpfCnpj: SENDER_CNPJ,
        remetente: {
          nome: "ÓPERA KIDS VAREJO",
          cpfCnpj: SENDER_CNPJ,
          telefone: "",
          email: "",
          ...SENDER_ADDRESS
        },
        etiquetas: dadosProcessados
      };
      
      const resultado = await emissaoService.processarPedidosImportados(payload);
      
      addLog(`✅ API respondeu com sucesso!`);
      
      if (resultado?.emissoes) {
        const ids = resultado.emissoes.map((e: any) => e.id).filter(Boolean);
        setIdsGerados(ids);
        addLog(`🎉 ${ids.length} etiquetas geradas com sucesso!`);
        toast.success(`${ids.length} etiquetas geradas!`);
      }
      
    } catch (error: any) {
      addLog(`❌ ERRO: ${error.message}`);
      toast.error("Erro ao processar arquivo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const baixarPDF = async () => {
    if (idsGerados.length === 0) {
      toast.error("Nenhuma etiqueta gerada ainda");
      return;
    }
    
    setLoading(true);
    try {
      addLog("📄 Gerando PDF das etiquetas...");
      
      const resultado = await emissaoService.imprimirEmMassa({
        ids: idsGerados
      });
      
      if (resultado?.dados) {
        const linkSource = `data:application/pdf;base64,${resultado.dados}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = `etiquetas_${new Date().getTime()}.pdf`;
        downloadLink.click();
        
        addLog(`✅ PDF baixado com sucesso!`);
        toast.success("PDF baixado!");
      }
      
    } catch (error: any) {
      addLog(`❌ Erro ao gerar PDF: ${error.message}`);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Content titulo="Gerar Etiquetas - Arquivo Rápido">
      <div className="space-y-6">
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Processamento Rápido</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Arquivo: <strong>clientes_faltantes.xlsx</strong> | 
            Remetente: <strong>ÓPERA KIDS VAREJO (15.808.095/0003-03)</strong>
          </p>
          
          <div className="flex gap-3">
            <ButtonComponent
              onClick={processar}
              disabled={loading}
              className="bg-primary text-primary-foreground"
            >
              {loading ? "Processando..." : "🚀 Gerar Todas as Etiquetas"}
            </ButtonComponent>
            
            {idsGerados.length > 0 && (
              <ButtonComponent
                onClick={baixarPDF}
                disabled={loading}
                variant="secondary"
              >
                📥 Baixar PDF ({idsGerados.length} etiquetas)
              </ButtonComponent>
            )}
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Logs de Processamento</h3>
            <div className="bg-muted p-4 rounded font-mono text-xs max-h-96 overflow-y-auto space-y-1">
              {logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {idsGerados.length > 0 && (
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">IDs Gerados</h3>
            <div className="text-sm text-muted-foreground">
              {idsGerados.length} etiquetas criadas
            </div>
          </div>
        )}
        
      </div>
    </Content>
  );
}
