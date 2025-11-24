import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Content } from "../../Content";
import { ViacepService } from "../../../../services/viacepService";
import { isValid as isValidCpf, strip as stripCpf, generate as generateCpf } from "@fnando/cpf";
import { supabase } from "../../../../integrations/supabase/client";
import { getSupabaseWithAuth } from "../../../../integrations/supabase/custom-auth";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

interface EnvioData {
  servico_frete: string;
  cep: string;
  altura: number;
  largura: number;
  comprimento: number;
  peso: number;
  logradouro: string;
  numero: number;
  complemento: string;
  nomeDestinatario: string;
  cpfCnpj: string;
  valor_frete: number;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface EtiquetaComErro {
  envio: EnvioData;
  motivo: string;
  linhaOriginal: number;
}

export default function CriarEtiquetasEmMassa() {
  const [remetenteCpfCnpj, setRemetenteCpfCnpj] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const viacepService = new ViacepService();

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const limparCpfCnpj = (cpfCnpj: string): string => {
    const value = cpfCnpj?.toString() || "";
    return stripCpf(value);
  };

  const validarCpf = (cpf: string): boolean => {
    const cleaned = stripCpf(cpf || "");
    if (!cleaned) return false;
    return isValidCpf(cleaned);
  };

  const gerarCpfValido = (): string => {
    // Usa a lib @fnando/cpf (mesma lógica do 4devs) e garante apenas dígitos
    const novoCpf = generateCpf();
    return stripCpf(novoCpf);
  };

  const consultarCep = async (cep: string): Promise<{ bairro: string; cidade: string; estado: string } | null> => {
    try {
      const cepLimpo = cep.replace(/[^\d]/g, "");
      const resultado = await viacepService.consulta(cepLimpo);
      return {
        bairro: resultado.bairro,
        cidade: resultado.localidade,
        estado: resultado.uf
      };
    } catch (error) {
      return null;
    }
  };

  const enviarParaApi = async (cpfCnpjRemetente: string, envios: EnvioData[], tentativa = 1): Promise<any> => {
    try {
      const payload = {
        cpfCnpj: cpfCnpjRemetente,
        data: envios.map((e) => ({
          ...e,
          // API espera número, não string
          cpfCnpj: Number(e.cpfCnpj),
        })),
      };

      const response = await axios.post(
        "https://envios.brhubb.com.br/api/importacao/multipla",
        payload,
        {
          headers: {
            "API-Version": "3.0.0",
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      // Log bruto da resposta para facilitar debug de formato de erro
      try {
        addLog(
          `Resposta bruta da API: ${JSON.stringify(error.response?.data || error.message)}`,
          "error"
        );
      } catch {
        // ignora falha de stringify
      }

      const errorDetails = error.response?.data?.error;

      if (tentativa === 1 && Array.isArray(errorDetails)) {
        // Ex.: "data.1.cpfCnpj: CPF/CNPJ inválido"
        const indicesComErroCpf = new Set<number>();

        errorDetails.forEach((e: any) => {
          if (typeof e.message === "string" && e.message.includes("cpfCnpj")) {
            const match = e.message.match(/data\.(\d+)\.cpfCnpj/i);
            if (match && match[1]) {
              indicesComErroCpf.add(Number(match[1]));
            }
          }
        });

        if (indicesComErroCpf.size > 0) {
          addLog(
            `API retornou CPF inválido para ${indicesComErroCpf.size} registro(s). Gerando novos CPFs e reenviando...`,
            "warning"
          );

          const enviosCorrigidos = envios.map((envio, index) => {
            if (indicesComErroCpf.has(index)) {
              const cpfOriginal = envio.cpfCnpj;
              const novoCpf = gerarCpfValido();
              addLog(
                `Indice ${index} – CPF inválido (${cpfOriginal}). Novo CPF gerado: ${novoCpf}`,
                "warning"
              );
              return {
                ...envio,
                cpfCnpj: novoCpf,
              };
            }
            return envio;
          });

          return enviarParaApi(cpfCnpjRemetente, enviosCorrigidos, 2);
        }
      }

      if (Array.isArray(errorDetails)) {
        const errorMessages = errorDetails.map((e: any) => e.message).join("; ");
        addLog(`Erros da API: ${errorMessages}`, "error");
      }

      throw error;
    }
  };

  const concatenarPdfs = async (pdfBase64Array: string[]): Promise<string> => {
    const mergedPdf = await PDFDocument.create();
    
    for (const base64 of pdfBase64Array) {
      try {
        const pdfBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
      } catch (error) {
        console.error("Erro ao processar PDF:", error);
      }
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    return btoa(String.fromCharCode(...mergedPdfBytes));
  };

  const salvarEtiquetasComErro = async (etiquetasComErro: EtiquetaComErro[], cpfCnpjRemetente: string) => {
    if (etiquetasComErro.length === 0) return;

    try {
      addLog(`Salvando ${etiquetasComErro.length} etiquetas com erro no Supabase para correção posterior...`, "info");

      // Obter cliente_id do JWT token
      const token = (await getSupabaseWithAuth().auth.getSession()).data.session?.access_token;
      const decoded: any = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const clienteId = decoded?.clienteId;

      if (!clienteId) {
        addLog(`Erro: cliente_id não encontrado no token`, "error");
        return;
      }

      // Preparar dados para inserção no Supabase
      const registrosParaInserir = etiquetasComErro.map(erro => ({
        cliente_id: clienteId,
        remetente_cpf_cnpj: cpfCnpjRemetente,
        remetente_nome: 'ÓPERA KIDS VAREJO',
        destinatario_nome: erro.envio.nomeDestinatario,
        destinatario_cpf_cnpj: erro.envio.cpfCnpj || null,
        destinatario_celular: null,
        destinatario_cep: erro.envio.cep,
        destinatario_logradouro: erro.envio.logradouro || null,
        destinatario_numero: erro.envio.numero?.toString() || null,
        destinatario_complemento: erro.envio.complemento || null,
        destinatario_bairro: erro.envio.bairro || null,
        destinatario_cidade: erro.envio.cidade || null,
        destinatario_estado: erro.envio.estado || null,
        altura: erro.envio.altura || null,
        largura: erro.envio.largura || null,
        comprimento: erro.envio.comprimento || null,
        peso: erro.envio.peso || null,
        valor_frete: erro.envio.valor_frete || null,
        valor_declarado: null,
        servico_frete: erro.envio.servico_frete || null,
        motivo_erro: erro.motivo,
        linha_original: erro.linhaOriginal,
        observacao: `ERRO IMPORTAÇÃO - ${erro.motivo}`,
        tentativas_correcao: 0
      }));

      const { error } = await supabase
        .from('etiquetas_pendentes_correcao')
        .insert(registrosParaInserir);

      if (error) {
        throw error;
      }

      addLog(`✓ ${etiquetasComErro.length} etiquetas com erro salvas no Supabase para correção`, "success");
      toast.success(`${etiquetasComErro.length} etiquetas com erro foram salvas no Gerenciador de Etiquetas`);
    } catch (error: any) {
      addLog(`Erro ao salvar etiquetas com erro no Supabase: ${error.message}`, "error");
      console.error("Erro salvamento etiquetas com erro:", error);
      toast.error("Erro ao salvar etiquetas com erro para correção");
    }
  };

  const processarPlanilha = async (file: File) => {
    setIsProcessing(true);
    setLogs([]);
    setPdfBase64(null);

    try {
      addLog(`Iniciando leitura da planilha: ${file.name}`, "info");
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

      addLog(`${rows.length} registros carregados da planilha`, "success");

      const cpfCnpjRemetenteClean = limparCpfCnpj(remetenteCpfCnpj);
      
      if (!cpfCnpjRemetenteClean) {
        addLog("CPF/CNPJ do remetente não informado!", "error");
        toast.error("Informe o CPF/CNPJ do remetente");
        setIsProcessing(false);
        return;
      }

      const enviosProcessados: EnvioData[] = [];
      const etiquetasComErro: EtiquetaComErro[] = [];
      let errosCep = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linhaNum = i + 2; // +2 porque linha 1 é cabeçalho e arrays começam em 0
        
        addLog(`Linha ${linhaNum} – Processando: ${row.nomeDestinatario} – CEP ${row.cep}`, "info");

        const dadosCep = await consultarCep(row.cep);
        
        // Se não conseguir bairro/cidade/estado válidos, salvar como erro
        if (!dadosCep || !dadosCep.bairro || !dadosCep.cidade || !dadosCep.estado) {
          addLog(`Linha ${linhaNum} – Erro ao consultar CEP ${row.cep} (será salvo para correção)`, "warning");
          errosCep++;
          
          // Salvar com dados parciais para correção posterior
          const envioComErro: EnvioData = {
            servico_frete: row.servico_frete?.toString().toUpperCase() || "PAC",
            cep: limparCpfCnpj(row.cep),
            altura: parseInt(row.altura) || 0,
            largura: parseInt(row.largura) || 0,
            comprimento: parseInt(row.comprimento) || 0,
            peso: parseInt(row.peso) || 0,
            logradouro: row.logradouro?.toString().trim() || "",
            numero: parseInt(row.numero) || 1,
            complemento: row.complemento?.toString().trim() || "",
            nomeDestinatario: row.nomeDestinatario?.toString().trim() || "",
            cpfCnpj: limparCpfCnpj(row.cpfCnpj) || "00000000000",
            valor_frete: parseFloat(row.valor_frete) || 0,
            bairro: "",
            cidade: "",
            estado: ""
          };
          
          etiquetasComErro.push({
            envio: envioComErro,
            motivo: `CEP ${row.cep} inválido - bairro/cidade/estado não encontrados`,
            linhaOriginal: linhaNum
          });
          
          continue;
        }
 
        addLog(`Linha ${linhaNum} – CEP consultado: ${dadosCep.bairro}, ${dadosCep.cidade}/${dadosCep.estado}`, "success");

        // Processar e validar CPF
        let cpfDestinatario = limparCpfCnpj(row.cpfCnpj);
        if (!validarCpf(cpfDestinatario)) {
          const cpfOriginal = cpfDestinatario;
          cpfDestinatario = gerarCpfValido();
          addLog(`Linha ${linhaNum} – CPF inválido (${cpfOriginal}). Gerando CPF válido: ${cpfDestinatario}`, "warning");
        }

        // Processar número (tratar null/undefined/<=0)
        let numero = parseInt(row.numero);
        if (isNaN(numero) || numero === null || numero === undefined || numero <= 0) {
          numero = 1;
          addLog(`Linha ${linhaNum} – Número inválido ou não informado (${row.numero}), usando valor 1`, "warning");
        }

        const envio: EnvioData = {
          servico_frete: row.servico_frete?.toString().toUpperCase() || "PAC",
          cep: limparCpfCnpj(row.cep),
          altura: parseInt(row.altura),
          largura: parseInt(row.largura),
          comprimento: parseInt(row.comprimento),
          peso: parseInt(row.peso),
          logradouro: row.logradouro?.toString().trim() || "",
          numero: numero,
          complemento: row.complemento?.toString().trim() || "",
          nomeDestinatario: row.nomeDestinatario?.toString().trim() || "",
          cpfCnpj: cpfDestinatario,
          valor_frete: parseFloat(row.valor_frete),
          bairro: dadosCep.bairro,
          cidade: dadosCep.cidade,
          estado: dadosCep.estado
        };

        enviosProcessados.push(envio);
      }

      // Salvar etiquetas com erro ANTES de verificar se há envios válidos
      if (etiquetasComErro.length > 0) {
        await salvarEtiquetasComErro(etiquetasComErro, cpfCnpjRemetenteClean);
      }

      if (enviosProcessados.length === 0) {
        addLog(`Todos os ${etiquetasComErro.length} registros falharam e foram salvos no Gerenciador para correção`, "info");
        toast.info(`${etiquetasComErro.length} etiquetas com erro foram salvas no Gerenciador de Etiquetas`);
        setIsProcessing(false);
        return;
      }

      addLog(`Enviando ${enviosProcessados.length} etiquetas para a API...`, "info");
      addLog(`Payload: ${JSON.stringify({ cpfCnpj: cpfCnpjRemetenteClean, totalEnvios: enviosProcessados.length })}`, "info");

      const resultado = await enviarParaApi(cpfCnpjRemetenteClean, enviosProcessados);
      
      addLog(`API respondeu com sucesso!`, "success");
      
      // Extrair PDFs da resposta
      const pdfArray: string[] = [];
      
      if (resultado.data && Array.isArray(resultado.data)) {
        resultado.data.forEach((item: any, idx: number) => {
          if (item.pdf_etiqueta) {
            pdfArray.push(item.pdf_etiqueta);
            addLog(`Etiqueta ${idx + 1} gerada com sucesso`, "success");
          } else {
            // Etiqueta falhou na geração - salvar para correção
            addLog(`Etiqueta ${idx + 1} – Falha na geração (será salva para correção)`, "warning");
            
            if (enviosProcessados[idx]) {
              etiquetasComErro.push({
                envio: enviosProcessados[idx],
                motivo: item.erro || item.mensagem || "Falha na geração da etiqueta pela API",
                linhaOriginal: idx + 1
              });
            }
          }
        });
      }

      if (pdfArray.length > 0) {
        addLog(`Concatenando ${pdfArray.length} PDFs em um único arquivo...`, "info");
        const pdfFinal = await concatenarPdfs(pdfArray);
        setPdfBase64(pdfFinal);
        addLog(`PDF único gerado com sucesso!`, "success");
      }

      const totalErros = etiquetasComErro.length;
      addLog(`Importação finalizada: ${pdfArray.length} etiquetas geradas, ${totalErros} salvas para correção`, "info");
      
      if (pdfArray.length > 0) {
        toast.success(`${pdfArray.length} etiquetas geradas com sucesso!`);
      }
      
      if (totalErros > 0) {
        toast.info(`${totalErros} etiquetas com erro foram salvas no Gerenciador para correção`);
      }

    } catch (error: any) {
      console.error("Erro no processamento:", error);
      addLog(`Erro crítico: ${error.message}`, "error");
      toast.error("Erro ao processar planilha");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processarPlanilha(file);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `etiquetas_massa_${new Date().getTime()}.pdf`;
    link.click();
    toast.success("Download iniciado!");
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "error": return "text-red-600";
      default: return "text-foreground";
    }
  };

  return (
    <Content titulo="Criar Etiquetas em Massa">
      <div className="space-y-6">
        {/* Card de Upload */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Upload da Planilha</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                CPF/CNPJ do Remetente *
              </label>
              <input
                type="text"
                value={remetenteCpfCnpj}
                onChange={(e) => setRemetenteCpfCnpj(e.target.value)}
                placeholder="Digite o CPF ou CNPJ do remetente"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                disabled={isProcessing}
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || !remetenteCpfCnpj}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-5 w-5" />
                {isProcessing ? "Processando..." : "Selecionar Planilha (.xlsx, .csv)"}
              </button>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Formato da planilha:</p>
                <p className="text-xs">
                  Colunas: servico_frete, cep, altura, largura, comprimento, peso, logradouro, 
                  numero, complemento, nomeDestinatario, cpfCnpj, valor_frete
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Área de Logs */}
        {logs.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Logs de Processamento</h3>
              <span className="text-sm text-muted-foreground">{logs.length} eventos</span>
            </div>
            
            <div className="bg-background border border-border rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className={`flex gap-3 ${getLogColor(log.type)}`}>
                  <span className="text-muted-foreground">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Botão de Download */}
        {pdfBase64 && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
            >
              <Download className="h-6 w-6" />
              Baixar todas as etiquetas (PDF único)
            </button>
          </div>
        )}
      </div>
    </Content>
  );
}
