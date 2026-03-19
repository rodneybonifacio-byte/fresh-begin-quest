// Criação de etiquetas em massa via planilha
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
import authStore from "../../../../authentica/authentication.store";
import { CreditoService } from "../../../../services/CreditoService";

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

  const limparCep = (cep: unknown): string => {
    const digits = String(cep ?? "").replace(/[^\d]/g, "");
    const normalized = digits.padStart(8, "0");
    return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
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

  // Função para formatar erros da API em string legível
  const formatarErroApi = (error: any): string => {
    // Se for um array de objetos com message
    if (Array.isArray(error)) {
      return error.map((e: any) => e.message || JSON.stringify(e)).join('; ');
    }
    // Se for um objeto com message
    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }
    // Se já for string
    if (typeof error === 'string') {
      return error;
    }
    // Fallback: stringify
    return JSON.stringify(error);
  };

  const consultarCep = async (cep: string): Promise<{ bairro: string; cidade: string; estado: string } | null> => {
    try {
      // CEP pode vir como número da planilha; normaliza para string com 8 dígitos
      const cepLimpo = limparCep(cep);
      if (cepLimpo.length !== 8) return null;
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
          cpfCnpj: (e.cpfCnpj || '').replace(/\D/g, '').padStart(11, '0'),
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
      const respData = error.response?.data;
      const respStr = JSON.stringify(respData || error.message || "");

      try {
        addLog(`Resposta bruta da API: ${respStr}`, "error");
      } catch { /* ignora */ }

      // Detecta qualquer menção a CPF/CNPJ no erro (case-insensitive)
      const erroCpf = /cpf|cnpj|documento.*inv/i.test(respStr);

      if (tentativa === 1 && erroCpf) {
        // Tenta identificar índices específicos primeiro
        const errorDetails = respData?.error;
        const indicesComErroCpf = new Set<number>();

        if (Array.isArray(errorDetails)) {
          errorDetails.forEach((e: any) => {
            const msg = typeof e === "string" ? e : e?.message || JSON.stringify(e);
            const match = msg.match(/data\.(\d+)\.cpfCnpj/i) || msg.match(/data\[(\d+)\].*cpf/i);
            if (match?.[1]) {
              indicesComErroCpf.add(Number(match[1]));
            }
          });
        }

        // Se não conseguiu identificar índices específicos, substitui TODOS
        const substituirTodos = indicesComErroCpf.size === 0;
        const qtd = substituirTodos ? envios.length : indicesComErroCpf.size;

        addLog(
          substituirTodos
            ? `⚠️ Erro de CPF detectado. Gerando CPFs válidos para TODOS os ${qtd} registros e reenviando...`
            : `⚠️ API retornou CPF inválido para ${qtd} registro(s). Gerando novos CPFs e reenviando...`,
          "warning"
        );

        const enviosCorrigidos = envios.map((envio, index) => {
          if (substituirTodos || indicesComErroCpf.has(index)) {
            const cpfOriginal = envio.cpfCnpj;
            const novoCpf = gerarCpfValido();
            addLog(`Índice ${index} – CPF (${cpfOriginal}) → Novo: ${novoCpf}`, "warning");
            return { ...envio, cpfCnpj: novoCpf };
          }
          return envio;
        });

        return enviarParaApi(cpfCnpjRemetente, enviosCorrigidos, 2);
      }

      // Tentativa 2 ainda com erro de CPF – gera CPFs novos para todos e tenta última vez
      if (tentativa === 2 && erroCpf) {
        addLog(`⚠️ Segunda tentativa ainda com erro de CPF. Gerando CPFs novos para TODOS e tentando pela última vez...`, "warning");

        const enviosCorrigidos = envios.map((envio, index) => {
          const novoCpf = gerarCpfValido();
          addLog(`Índice ${index} – Novo CPF gerado: ${novoCpf}`, "warning");
          return { ...envio, cpfCnpj: novoCpf };
        });

        return enviarParaApi(cpfCnpjRemetente, enviosCorrigidos, 3);
      }

      if (Array.isArray(respData?.error)) {
        const errorMessages = respData.error.map((e: any) =>
          typeof e === "string" ? e : e?.message || JSON.stringify(e)
        ).join("; ");
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

  const salvarEtiquetasComErro = async (etiquetasComErro: EtiquetaComErro[], cpfCnpjRemetente: string): Promise<number> => {
    if (etiquetasComErro.length === 0) return 0;

    try {
      addLog(`📝 Salvando ${etiquetasComErro.length} etiquetas com erro para correção posterior...`, "info");

      // Buscar clienteId do token JWT armazenado
      const userData = authStore.getUser();
      if (!userData) {
        throw new Error("Usuário não autenticado - faça login novamente");
      }

      // Tentar extrair clienteId de diferentes claims do token
      const clienteId = (userData as any).clienteId || (userData as any).sub || userData.id;
      if (!clienteId) {
        console.error("Token decodificado:", userData);
        throw new Error("Cliente ID não encontrado no token - claims disponíveis: " + Object.keys(userData).join(", "));
      }

      // Validar que é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clienteId)) {
        console.error("Cliente ID não é um UUID válido:", clienteId);
        throw new Error(`Cliente ID inválido (não é UUID): ${clienteId}`);
      }

      addLog(`🔑 Cliente ID: ${clienteId}`, "info");

      // Token do BRHUB (auth custom)
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Token não encontrado no localStorage - faça login novamente");
      }
      
      addLog(`🔐 Token válido encontrado`, "info");

      const registrosParaSalvar = etiquetasComErro.map((erro, index) => {
        addLog(`📋 Registro ${index + 1}/${etiquetasComErro.length}: ${erro.envio.nomeDestinatario} - Motivo: ${erro.motivo}`, "info");
        
        return {
          cliente_id: clienteId,
          remetente_cpf_cnpj: cpfCnpjRemetente,
          remetente_nome: "ÓPERA KIDS VAREJO",
          destinatario_nome: erro.envio.nomeDestinatario,
          destinatario_cpf_cnpj: erro.envio.cpfCnpj || "",
          destinatario_celular: "",
          destinatario_cep: erro.envio.cep,
          destinatario_logradouro: erro.envio.logradouro || "",
          destinatario_numero: erro.envio.numero?.toString() || "1",
          destinatario_complemento: erro.envio.complemento || "",
          destinatario_bairro: erro.envio.bairro || "",
          destinatario_cidade: erro.envio.cidade || "",
          destinatario_estado: erro.envio.estado || "",
          altura: erro.envio.altura || 0,
          largura: erro.envio.largura || 0,
          comprimento: erro.envio.comprimento || 0,
          peso: erro.envio.peso || 0,
          valor_frete: erro.envio.valor_frete || 0,
          valor_declarado: 0,
          servico_frete: erro.envio.servico_frete || "PAC",
          observacao: `ERRO IMPORTAÇÃO LINHA ${erro.linhaOriginal}`,
          motivo_erro: erro.motivo,
          linha_original: erro.linhaOriginal,
          tentativas_correcao: 0
        };
      });

      addLog(`💾 Tentando salvar ${registrosParaSalvar.length} registros no Supabase...`, "info");

      // Salvar via backend function (service role) para não depender do JWT do Supabase
      const { data, error } = await supabase.functions.invoke('etiquetas-pendentes-salvar', {
        headers: { 'x-brhub-authorization': `Bearer ${token}` },
        body: { registros: registrosParaSalvar },
      });

      if (error) {
        addLog(`❌ Erro ao salvar no Supabase: ${error.message}`, "error");
        throw error;
      }

      const inserted = (data as any)?.inserted ?? registrosParaSalvar.length;
      addLog(`✅ ${inserted} etiquetas com erro salvas com sucesso no gerenciador`, "success");
      toast.success(`${inserted} etiquetas com erro foram salvas para correção posterior`);
      return inserted;
    } catch (error: any) {
      addLog(`⚠️ ERRO CRÍTICO ao salvar etiquetas: ${error.message}`, "error");
      console.error("Erro completo salvamento etiquetas:", error);
      toast.error(`Falha ao salvar etiquetas com erro: ${error.message}`);
      return 0;
    }
  };

  const processarPlanilha = async (file: File) => {
    setIsProcessing(true);
    setLogs([]);
    setPdfBase64(null);

    let enviosProcessados: EnvioData[] = [];
    let cpfCnpjRemetenteClean = "";

    try {
      addLog(`Iniciando leitura da planilha: ${file.name}`, "info");
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

      addLog(`${rows.length} registros carregados da planilha`, "success");

      cpfCnpjRemetenteClean = limparCpfCnpj(remetenteCpfCnpj);
      
      if (!cpfCnpjRemetenteClean) {
        addLog("CPF/CNPJ do remetente não informado!", "error");
        toast.error("Informe o CPF/CNPJ do remetente");
        setIsProcessing(false);
        return;
      }

      enviosProcessados = [];
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
            cep: limparCep(row.cep),
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
          cep: limparCep(row.cep),
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

      let totalErrosSalvos = 0;

      // Salvar etiquetas com erro ANTES de verificar se há envios válidos
      if (etiquetasComErro.length > 0) {
        totalErrosSalvos += await salvarEtiquetasComErro(etiquetasComErro, cpfCnpjRemetenteClean);
        // evitar duplicar: erros de CEP já foram enviados ao gerenciador
        etiquetasComErro.length = 0;
      }

      if (enviosProcessados.length === 0) {
        addLog(`Todos os ${etiquetasComErro.length} registros falharam e foram salvos no Gerenciador para correção`, "info");
         if (totalErrosSalvos > 0) {
           toast.info(`${totalErrosSalvos} etiquetas com erro foram salvas no Gerenciador de Etiquetas`);
         }
        setIsProcessing(false);
        return;
      }

      addLog(`Enviando ${enviosProcessados.length} etiquetas para a API...`, "info");
      addLog(`Payload: ${JSON.stringify({ cpfCnpj: cpfCnpjRemetenteClean, totalEnvios: enviosProcessados.length })}`, "info");

      const resultado = await enviarParaApi(cpfCnpjRemetenteClean, enviosProcessados);
      
      addLog(`API respondeu com sucesso!`, "success");
      
      // Extrair PDFs da resposta e bloquear créditos
      const pdfArray: string[] = [];
      const creditoService = new CreditoService();
      
      // Obter clienteId para bloquear créditos
      const userData = authStore.getUser();
      const clienteId = (userData as any)?.clienteId || userData?.id;
      
      if (resultado.data && Array.isArray(resultado.data)) {
        for (let idx = 0; idx < resultado.data.length; idx++) {
          const item = resultado.data[idx];
          if (item.pdf_etiqueta) {
            pdfArray.push(item.pdf_etiqueta);
            addLog(`Etiqueta ${idx + 1} gerada com sucesso`, "success");
            
            // Bloquear créditos para esta etiqueta
            if (clienteId && item.id) {
              try {
                const valorFrete = parseFloat(item.valorTotal || item.frete?.valorTotal || enviosProcessados[idx]?.valor_frete || '0');
                const codigoObjeto = item.codigoObjeto || item.codigo_objeto;
                
                if (valorFrete > 0) {
                  await creditoService.bloquearCreditoEtiqueta(
                    clienteId,
                    item.id,
                    valorFrete,
                    codigoObjeto
                  );
                  addLog(`💰 Crédito R$ ${valorFrete.toFixed(2)} bloqueado para etiqueta ${codigoObjeto || item.id}`, "info");
                }
              } catch (creditoError: any) {
                console.error("Erro ao bloquear crédito:", creditoError);
                addLog(`⚠️ Erro ao bloquear crédito para etiqueta ${idx + 1}: ${creditoError.message}`, "warning");
              }
            }
          } else {
            // Etiqueta falhou na geração - salvar para correção
            addLog(`Etiqueta ${idx + 1} – Falha na geração (será salva para correção)`, "warning");
            
            if (enviosProcessados[idx]) {
              etiquetasComErro.push({
                envio: enviosProcessados[idx],
                motivo: formatarErroApi(item.erro) || item.mensagem || "Falha na geração da etiqueta pela API",
                linhaOriginal: idx + 1
              });
            }
          }
        }
      }

      // Salvar etiquetas que falharam na geração pela API
      if (etiquetasComErro.length > 0) {
        totalErrosSalvos += await salvarEtiquetasComErro(etiquetasComErro, cpfCnpjRemetenteClean);
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
        if (totalErrosSalvos > 0) {
          toast.info(`${totalErrosSalvos} etiquetas com erro foram salvas no Gerenciador para correção`);
        } else {
          toast.error(`Não foi possível salvar as etiquetas com erro no Gerenciador`);
        }
      }

    } catch (error: any) {
      console.error("Erro no processamento:", error);
      addLog(`Erro crítico: ${error.message}`, "error");
      
      // Se houver enviosProcessados mas falhou completamente, salvar todos como erro
      if (enviosProcessados && enviosProcessados.length > 0) {
        const todosComErro: EtiquetaComErro[] = enviosProcessados.map((envio, idx) => ({
          envio,
          motivo: formatarErroApi(error.response?.data?.error) || error.message || "Erro crítico na importação",
          linhaOriginal: idx + 1
        }));
        
        const inserted = await salvarEtiquetasComErro(todosComErro, limparCpfCnpj(remetenteCpfCnpj));
        if (inserted > 0) {
          addLog(`${inserted} etiquetas foram salvas no Gerenciador para correção`, "info");
        }
      }
      
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
