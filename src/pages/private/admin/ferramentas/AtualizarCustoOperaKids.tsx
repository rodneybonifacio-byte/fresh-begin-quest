import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../../../integrations/supabase/client";
import { Calculator, Play, Eye, Loader2, CheckCircle, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { ModalCustom } from "../../../../components/modal";
import { format } from "date-fns";

interface PreviewItem {
  id: string;
  codigoObjeto: string;
  remetenteNome: string;
  valorVenda: string;
  custoAtual: string;
  novoCusto: string;
  diferenca: string;
}

interface ResumoAtualizacao {
  totalEtiquetas: number;
  totalVenda: string;
  totalCustoAtual: string;
  totalNovoCusto: string;
  diferencaTotal: string;
  atualizadas?: number;
  erros?: number;
}

export function AtualizarCustoOperaKids() {
  const [showModal, setShowModal] = useState(false);
  const [remetenteNome, setRemetenteNome] = useState("OPERA KIDS VAREJO");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [resumo, setResumo] = useState<ResumoAtualizacao | null>(null);
  const [totalPreview, setTotalPreview] = useState(0);
  const [executado, setExecutado] = useState(false);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) throw new Error("Token não encontrado");

      const { data: response, error } = await supabase.functions.invoke("atualizar-custo-operakids", {
        headers: { "x-brhub-authorization": `Bearer ${token}` },
        body: {
          remetenteNome,
          data,
          dryRun: true,
        },
      });

      if (error) throw new Error(error.message);
      if (!response?.success) throw new Error(response?.error || "Erro desconhecido");

      return response;
    },
    onSuccess: (response) => {
      setPreview(response.preview || []);
      setResumo(response.resumo);
      setTotalPreview(response.totalPreview || 0);
      setExecutado(false);
      toast.success(`Preview: ${response.resumo?.totalEtiquetas || 0} etiquetas encontradas`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) throw new Error("Token não encontrado");

      const { data: response, error } = await supabase.functions.invoke("atualizar-custo-operakids", {
        headers: { "x-brhub-authorization": `Bearer ${token}` },
        body: {
          remetenteNome,
          data,
          dryRun: false,
        },
      });

      if (error) throw new Error(error.message);
      if (!response?.success) throw new Error(response?.error || "Erro desconhecido");

      return response;
    },
    onSuccess: (response) => {
      setResumo(response.resumo);
      setExecutado(true);
      toast.success(response.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenModal = () => {
    setShowModal(true);
    setPreview(null);
    setResumo(null);
    setExecutado(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPreview(null);
    setResumo(null);
    setExecutado(false);
  };

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleExecutar = () => {
    if (!confirm(`Tem certeza que deseja atualizar ${resumo?.totalEtiquetas || 0} etiquetas?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    executeMutation.mutate();
  };

  if (!showModal) {
    return (
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Calculator className="h-4 w-4" />
        Atualizar Custos OPERA KIDS
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Calculator className="h-4 w-4" />
        Atualizar Custos OPERA KIDS
      </button>

      <ModalCustom
        title="Atualizar Custos - OPERA KIDS"
        onCancel={handleCloseModal}
        size="large"
      >
        <div className="space-y-6">
          {/* Descrição */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100">Fórmula de Cálculo</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  <strong>Custo = Valor Venda × 0.78</strong> (Venda - 22%)
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Remetente
              </label>
              <input
                type="text"
                value={remetenteNome}
                onChange={(e) => setRemetenteNome(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                placeholder="Nome do remetente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Visualizar Preview
            </button>

            {preview && preview.length > 0 && !executado && (
              <button
                onClick={handleExecutar}
                disabled={executeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {executeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Executar Atualização
              </button>
            )}
          </div>

          {/* Resumo */}
          {resumo && (
            <div className={`p-4 rounded-lg border ${
              executado 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                : "bg-muted border-border"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {executado ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <h4 className="font-medium text-foreground">
                  {executado ? "Atualização Concluída" : "Preview - Resumo"}
                </h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Etiquetas:</span>
                  <p className="font-bold text-foreground">
                    {executado ? resumo.atualizadas : resumo.totalEtiquetas}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Venda:</span>
                  <p className="font-bold text-foreground">R$ {resumo.totalVenda}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Custo Anterior:</span>
                  <p className="font-bold text-foreground">
                    R$ {executado ? resumo.totalCustoAtual : resumo.totalCustoAtual}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Novo Custo:</span>
                  <p className="font-bold text-green-600">R$ {resumo.totalNovoCusto}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {executado ? "Economia:" : "Diferença:"}
                  </span>
                  <p className="font-bold text-blue-600">R$ {resumo.diferencaTotal}</p>
                </div>
              </div>

              {executado && resumo.erros && resumo.erros > 0 && (
                <p className="mt-2 text-sm text-red-600">
                  {resumo.erros} etiqueta(s) com erro
                </p>
              )}
            </div>
          )}

          {/* Tabela de preview */}
          {preview && preview.length > 0 && !executado && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm text-muted-foreground">
                Mostrando {preview.length} de {totalPreview} etiquetas
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Código</th>
                      <th className="px-3 py-2 text-right font-medium">Venda</th>
                      <th className="px-3 py-2 text-right font-medium">Custo Atual</th>
                      <th className="px-3 py-2 text-right font-medium">Novo Custo</th>
                      <th className="px-3 py-2 text-right font-medium">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2 font-mono text-xs">{item.codigoObjeto}</td>
                        <td className="px-3 py-2 text-right">R$ {item.valorVenda}</td>
                        <td className="px-3 py-2 text-right">R$ {item.custoAtual}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">
                          R$ {item.novoCusto}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600">
                          R$ {item.diferenca}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensagem quando não há etiquetas */}
          {preview && preview.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma etiqueta encontrada com os filtros especificados.</p>
            </div>
          )}
        </div>
      </ModalCustom>
    </>
  );
}
