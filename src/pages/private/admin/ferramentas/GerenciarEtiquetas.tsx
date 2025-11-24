import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Content, type ContentButtonProps } from "../../Content";
import { EmissaoService } from "../../../../services/EmissaoService";
import { DataTable, type Column } from "../../../../components/DataTable";
import { Trash2, Filter, X, DollarSign, Calendar, User, Activity, FileText, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ModalCustom } from "../../../../components/modal";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadgeEmissao } from "../../../../components/StatusBadgeEmissao";
import type { IEmissao } from "../../../../types/IEmissao";
import { formatCpfCnpj } from "../../../../utils/lib.formats";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { ModalAtualizarPrecosEmMassa } from "./ModalAtualizarPrecosEmMassa";

const emissaoService = new EmissaoService();

export default function GerenciarEtiquetas() {
  const { setIsLoading: setGlobalLoading } = useLoadingSpinner();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<Record<string, { codigoObjeto: string }>>({});
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [showModalAtualizarPrecos, setShowModalAtualizarPrecos] = useState(false);
  const [filters, setFilters] = useState({
    remetente: "",
    status: [] as string[],
    dataInicio: "",
    dataFim: ""
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [selectedEmissaoDetail, setSelectedEmissaoDetail] = useState<IEmissao | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["emissoes-gerenciar", page, appliedFilters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: 50,
        offset: (page - 1) * 50
      };

      if (appliedFilters.remetente) params.remetenteNome = appliedFilters.remetente;
      if (appliedFilters.dataInicio) params.dataIni = appliedFilters.dataInicio;
      if (appliedFilters.dataFim) params.dataFim = appliedFilters.dataFim;
      if (appliedFilters.status.length > 0) params.status = appliedFilters.status.join(',');

      console.log('Parâmetros enviados para API (gerenciar etiquetas):', params);
      const response = await emissaoService.getAll(params, 'admin');
      console.log('Quantidade de resultados (API):', response.data?.length);
      console.log('Total da API:', response.total);

      // Atualizar o total filtrado
      if (response.total !== undefined) {
        setFilteredTotal(response.total);
      } else if (response.data) {
        setFilteredTotal(response.data.length);
      }

      return response;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const batchSize = 10; // Processar 10 por vez
      const results: any[] = [];
      const errors: any[] = [];
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        console.log(`Excluindo lote ${i / batchSize + 1}:`, batch);
        
        try {
          const promises = batch.map(id => {
            const meta = selectedMeta[id];
            if (!meta?.codigoObjeto) {
              console.warn(`Sem codigoObjeto para id ${id}, pulando.`);
              errors.push({ id, error: 'Sem codigoObjeto' });
              return Promise.resolve(null);
            }

            const payload = {
              codigoObjeto: meta.codigoObjeto,
              motivo: 'Cancelado via Gerenciar Etiquetas',
            };

            return emissaoService.cancelarEmissao(payload)
              .catch(err => {
                console.error(`Erro ao excluir ${id}:`, err);
                errors.push({ id, error: err });
                return null;
              });
          });

          const batchResults = await Promise.all(promises);
          results.push(...batchResults.filter(r => r !== null));
        } catch (error) {
          console.error(`Erro no lote ${i / batchSize + 1}:`, error);
          errors.push({ batch, error });
        }
      }
      
      console.log(`Total processado: ${results.length}, Erros: ${errors.length}`);
      return { results, errors };
    },
    onSuccess: (data) => {
      const { results, errors } = data;
      if (errors.length > 0) {
        toast.warning(`${results.length} excluídas com sucesso. ${errors.length} com erro.`);
        console.error('Erros detalhados:', errors);
      } else {
        toast.success(`${results.length} etiquetas excluídas com sucesso!`);
      }
      setSelectedIds([]);
      setSelectAllMode('none');
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    },
    onError: (error) => {
      console.error('Erro geral na exclusão:', error);
      toast.error("Erro ao excluir etiquetas");
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const batchSize = 10;
      const results: any[] = [];
      const errors: any[] = [];
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        console.log(`Reativando lote ${i / batchSize + 1}:`, batch);
        
        try {
          const promises = batch.map(id => {
            const meta = selectedMeta[id];
            if (!meta?.codigoObjeto) {
              console.warn(`Sem codigoObjeto para id ${id}, pulando.`);
              errors.push({ id, error: 'Sem codigoObjeto' });
              return Promise.resolve(null);
            }

            // Chamada para reativar - ajustar endpoint quando disponível
            return emissaoService.reprocessarEmissao(id)
              .catch(err => {
                console.error(`Erro ao reativar ${id}:`, err);
                errors.push({ id, error: err });
                return null;
              });
          });

          const batchResults = await Promise.all(promises);
          results.push(...batchResults.filter(r => r !== null));
        } catch (error) {
          console.error(`Erro no lote ${i / batchSize + 1}:`, error);
          errors.push({ batch, error });
        }
      }
      
      console.log(`Total reativado: ${results.length}, Erros: ${errors.length}`);
      return { results, errors };
    },
    onSuccess: (data) => {
      const { results, errors } = data;
      if (errors.length > 0) {
        toast.warning(`${results.length} reativadas com sucesso. ${errors.length} com erro.`);
        console.error('Erros detalhados:', errors);
      } else {
        toast.success(`${results.length} etiquetas reativadas com sucesso!`);
      }
      setSelectedIds([]);
      setSelectAllMode('none');
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    },
    onError: (error) => {
      console.error('Erro geral na reativação:', error);
      toast.error("Erro ao reativar etiquetas");
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      const pageIds: string[] = [];
      const meta: Record<string, { codigoObjeto: string }> = {};

      data.data.forEach((item: IEmissao) => {
        if (!item.id || !item.codigoObjeto) return;
        pageIds.push(item.id);
        meta[item.id] = { codigoObjeto: item.codigoObjeto };
      });

      setSelectedIds(pageIds);
      setSelectedMeta(meta);
      setSelectAllMode('page');
    } else {
      setSelectedIds([]);
      setSelectedMeta({});
      setSelectAllMode('none');
    }
  };

  const handleSelectAllFiltered = async () => {
    try {
      setGlobalLoading(true);

      const batchSize = 100;
      let offset = 0;
      let hasMore = true;
      let allIds: string[] = [];
      let meta: Record<string, { codigoObjeto: string }> = {};

      while (hasMore) {
        const params: Record<string, string | number> = {
          limit: batchSize,
          offset,
        };

        if (appliedFilters.remetente) params.remetenteNome = appliedFilters.remetente;
        if (appliedFilters.dataInicio) params.dataIni = appliedFilters.dataInicio;
        if (appliedFilters.dataFim) params.dataFim = appliedFilters.dataFim;
        if (appliedFilters.status.length > 0) params.status = appliedFilters.status.join(',');

        const response = await emissaoService.getAll(params, 'admin');
        const pageData = response.data || [];

        if (pageData.length === 0) {
          hasMore = false;
        } else {
          pageData.forEach((item: IEmissao) => {
            if (!item.id || !item.codigoObjeto) return;
            allIds.push(item.id);
            meta[item.id] = { codigoObjeto: item.codigoObjeto };
          });

          offset += batchSize;
          if (pageData.length < batchSize) {
            hasMore = false;
          }
        }
      }

      setSelectedIds(allIds);
      setSelectedMeta(meta);
      setSelectAllMode('all');
      toast.success(`${allIds.length} etiquetas selecionadas`);
    } catch (error) {
      toast.error("Erro ao selecionar todas as etiquetas");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      if (!selectedIds.includes(id)) {
        setSelectedIds(prev => [...prev, id]);
      }

      // garantir meta usando dados da página atual
      const fromPage = data?.data?.find((e: IEmissao) => e.id === id);
      if (fromPage?.codigoObjeto) {
        setSelectedMeta(prev => ({
          ...prev,
          [id]: { codigoObjeto: fromPage.codigoObjeto as string },
        }));
      }
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      setSelectedMeta(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos uma etiqueta");
      return;
    }

    const message = selectAllMode === 'all' 
      ? `Deseja realmente excluir TODAS as ${selectedIds.length} etiquetas filtradas?`
      : `Deseja realmente excluir ${selectedIds.length} etiqueta(s)?`;

    if (confirm(message)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  const handleReactivate = () => {
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos uma etiqueta");
      return;
    }

    const message = selectAllMode === 'all'
      ? `Deseja realmente reativar TODAS as ${selectedIds.length} etiquetas filtradas?`
      : `Deseja realmente reativar ${selectedIds.length} etiqueta(s) cancelada(s)?`;

    if (confirm(message)) {
      reactivateMutation.mutate(selectedIds);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { remetente: "", status: [] as string[], dataInicio: "", dataFim: "" };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const handleStatusChange = (statusValue: string) => {
    setFilters(prev => {
      const currentStatus = prev.status;
      if (currentStatus.includes(statusValue)) {
        return { ...prev, status: currentStatus.filter(s => s !== statusValue) };
      } else {
        return { ...prev, status: [...currentStatus, statusValue] };
      }
    });
  };

  const columns: Column<IEmissao>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={data?.data ? (selectedIds.length > 0 && selectedIds.length === data.data.length) : false}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      accessor: (item: IEmissao) => (
        <input
          type="checkbox"
          checked={!!item.id && selectedIds.includes(item.id)}
          onChange={(e) => handleSelectOne(item.id || "", e.target.checked)}
          className="rounded border-gray-300"
        />
      )
    },
    {
      header: "Código",
      accessor: (item: IEmissao) => item.codigoObjeto || "-"
    },
    {
      header: "Transportadora",
      accessor: (item: IEmissao) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.transportadora}</span>
          {item.transportadora?.toLocaleUpperCase() === 'CORREIOS' && (
            <small className="text-slate-500 dark:text-slate-400">{item.servico}</small>
          )}
        </div>
      )
    },
    {
      header: "Remetente",
      accessor: (item: IEmissao) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.remetenteNome}</span>
          <small className="text-slate-500 dark:text-slate-400">
            {(item as any).remetenteLocalidade} - {(item as any).remetenteUf}
          </small>
        </div>
      )
    },
    {
      header: "Cliente",
      accessor: (item: IEmissao) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{item.cliente?.nome}</span>
          <small className="text-slate-500 dark:text-slate-400">
            {formatCpfCnpj(item.cliente?.cpfCnpj || '')}
          </small>
        </div>
      )
    },
    {
      header: "Destinatário",
      accessor: (item: IEmissao) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.destinatario?.nome}</span>
          <small className="text-slate-500 dark:text-slate-400">
            {item.destinatario?.endereco?.localidade || ''} - {item.destinatario?.endereco?.uf || ''}
          </small>
        </div>
      )
    },
    {
      header: "Status",
      accessor: (item: IEmissao) => (
        <StatusBadgeEmissao status={item.status} mensagensErrorPostagem={item.mensagensErrorPostagem || ""} handleOnViewErroPostagem={() => {}} />
      )
    },
    {
      header: "Data Criação",
      accessor: (item: IEmissao) => 
        item.criadoEm ? format(new Date(item.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"
    }
  ];

  // Verificar se há etiquetas canceladas selecionadas
  const hasCanceledSelected = selectedIds.length > 0 && data?.data?.some((item: IEmissao) => 
    selectedIds.includes(item.id || "") && item.status === "CANCELADO"
  );

  const handleAtualizarPrecos = () => {
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos uma etiqueta");
      return;
    }
    setShowModalAtualizarPrecos(true);
  };

  const handleRegerarEtiqueta = () => {
    if (selectedIds.length !== 1) {
      toast.warning("Selecione apenas uma etiqueta para regerar");
      return;
    }
    
    const emissao = data?.data?.find((e: IEmissao) => e.id === selectedIds[0]);
    if (!emissao) {
      toast.error("Etiqueta não encontrada");
      return;
    }

    // Navegar para página de emissão com dados preenchidos
    navigate('/emissao', { 
      state: { 
        prefilledData: {
          remetenteId: emissao.remetenteId,
          destinatario: emissao.destinatario,
          embalagem: emissao.embalagem,
          valorDeclarado: emissao.valorDeclarado,
          observacao: emissao.observacao,
          chaveNFe: emissao.chaveNFe,
          numeroNotaFiscal: emissao.numeroNotaFiscal,
        }
      } 
    });
    toast.success("Dados carregados! Preencha os detalhes e gere a nova etiqueta");
  };

  const buttons: ContentButtonProps[] = [
    {
      label: "Filtros",
      icon: <Filter className="h-4 w-4" />,
      onClick: () => setShowFilters(!showFilters),
      bgColor: "bg-gray-200 hover:bg-gray-300 text-gray-800"
    },
    {
      label: selectAllMode === 'all' ? "Todas Selecionadas" : "Selecionar Todas Filtradas",
      onClick: handleSelectAllFiltered,
      bgColor: selectAllMode === 'all' ? "bg-green-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
    },
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: () => {
        if (selectedIds.length === 1) {
          const emissao = data?.data?.find((e: IEmissao) => e.id === selectedIds[0]);
          if (emissao) {
            setSelectedEmissaoDetail(emissao);
            setShowDetailModal(true);
          }
        } else {
          toast.warning("Selecione apenas uma etiqueta para ver detalhes");
        }
      },
      bgColor: selectedIds.length !== 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600 text-white"
    },
    {
      label: "Regerar Etiqueta",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: handleRegerarEtiqueta,
      bgColor: selectedIds.length !== 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-600 text-white"
    },
    {
      label: "Remover Seleção",
      icon: <X className="h-4 w-4" />,
      onClick: () => {
        setSelectedIds([]);
        setSelectedMeta({});
        setSelectAllMode('none');
      },
      bgColor: selectedIds.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
    },
    {
      label: `Atualizar Preços (${selectedIds.length})`,
      icon: <DollarSign className="h-4 w-4" />,
      onClick: handleAtualizarPrecos,
      bgColor: selectedIds.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-purple-500 hover:bg-purple-600 text-white"
    },
    {
      label: `Excluir Selecionadas (${selectedIds.length})`,
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      bgColor: selectedIds.length === 0 || deleteMutation.isPending ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"
    },
    {
      label: `Reativar Canceladas (${selectedIds.length})`,
      onClick: handleReactivate,
      bgColor: selectedIds.length === 0 || reactivateMutation.isPending ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white",
      isShow: !hasCanceledSelected // Ocultar quando NÃO há canceladas
    }
  ];

  return (
    <Content
      titulo="Gerenciar Etiquetas"
      subTitulo="Visualize, filtre e exclua etiquetas em massa"
      isButton={true}
      button={buttons}
      isLoading={isLoading}
    >
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Remetente</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                placeholder="Nome do remetente"
                value={filters.remetente}
                onChange={(e) => setFilters({ ...filters, remetente: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status (Múltipla Seleção)</label>
              <div className="space-y-2 border rounded-md p-3 dark:bg-slate-700 dark:border-gray-600">
                {[
                  { value: 'PRE_POSTADO', label: 'Pré-postado' },
                  { value: 'POSTADO', label: 'Postado' },
                  { value: 'EM_TRANSITO', label: 'Em Trânsito' },
                  { value: 'ENTREGUE', label: 'Entregue' },
                  { value: 'CANCELADO', label: 'Cancelado' }
                ].map(status => (
                  <label key={status.value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.value)}
                      onChange={() => handleStatusChange(status.value)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Início</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Fim</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              <X className="h-4 w-4 inline mr-2" />
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Resumo dos Filtros Ativos */}
      {(appliedFilters.remetente || appliedFilters.status.length > 0 || appliedFilters.dataInicio || appliedFilters.dataFim) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Filtros Ativos</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                {appliedFilters.remetente && (
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Remetente:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{appliedFilters.remetente}</p>
                    </div>
                  </div>
                )}
                
                {(appliedFilters.dataInicio || appliedFilters.dataFim) && (
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Período:</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {appliedFilters.dataInicio ? format(new Date(appliedFilters.dataInicio), "dd/MM/yyyy", { locale: ptBR }) : "?"} 
                        {" até "}
                        {appliedFilters.dataFim ? format(new Date(appliedFilters.dataFim), "dd/MM/yyyy", { locale: ptBR }) : "?"}
                      </p>
                    </div>
                  </div>
                )}
                
                {appliedFilters.status.length > 0 && (
                  <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
                    <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Status ({appliedFilters.status.length}):</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {appliedFilters.status.map(s => s.replace('_', ' ')).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Total Filtrado:</span>
                    <p className="font-bold text-green-700 dark:text-green-300 text-lg">{filteredTotal}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              Limpar
            </button>
          </div>
        </div>
      )}

      {selectAllMode === 'page' && selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {selectedIds.length} etiquetas selecionadas nesta página. 
            <button 
              onClick={handleSelectAllFiltered}
              className="ml-2 font-semibold underline hover:no-underline"
            >
              Selecionar todas as {filteredTotal} etiquetas filtradas
            </button>
          </p>
        </div>
      )}

      {selectAllMode === 'all' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-900 dark:text-green-100">
            ✓ Todas as {selectedIds.length} etiquetas filtradas estão selecionadas
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        rowKey={(item) => item.id || ""}
      />

      <div className="flex justify-center gap-2 mt-4">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Anterior
        </button>
        <span className="flex items-center px-4 text-sm">
          Página {page} • {data?.data?.length || 0} de {filteredTotal} registros
        </span>
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!data?.data?.length || data.data.length < 50}
          onClick={() => setPage(p => p + 1)}
        >
          Próxima
        </button>
      </div>

      <ModalAtualizarPrecosEmMassa
        isOpen={showModalAtualizarPrecos}
        selectedIds={selectedIds}
        onClose={() => setShowModalAtualizarPrecos(false)}
        onSuccess={() => {
          setSelectedIds([]);
          setSelectAllMode('none');
        }}
      />

      {showDetailModal && selectedEmissaoDetail && (
        <ModalCustom
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedEmissaoDetail(null);
          }}
          title="Detalhes da Etiqueta"
          size="large"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Dados do Destinatário</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nome</p>
                  <p className="font-medium">{selectedEmissaoDetail.destinatario?.nome || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">CPF/CNPJ</p>
                  <p className="font-medium">{selectedEmissaoDetail.destinatario?.cpfCnpj ? formatCpfCnpj(selectedEmissaoDetail.destinatario.cpfCnpj) : '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Endereço</p>
                  <p className="font-medium">
                    {selectedEmissaoDetail.destinatario?.endereco?.logradouro || '-'}, {selectedEmissaoDetail.destinatario?.endereco?.numero || '-'} 
                    {selectedEmissaoDetail.destinatario?.endereco?.complemento ? ` - ${selectedEmissaoDetail.destinatario.endereco.complemento}` : ''}
                    <br />
                    {selectedEmissaoDetail.destinatario?.endereco?.bairro || '-'}, {selectedEmissaoDetail.destinatario?.endereco?.localidade || '-'}-{selectedEmissaoDetail.destinatario?.endereco?.uf || '-'} 
                    {' '}{selectedEmissaoDetail.destinatario?.endereco?.cep || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Dados do Remetente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nome</p>
                  <p className="font-medium">{selectedEmissaoDetail.remetenteNome || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">CPF/CNPJ</p>
                  <p className="font-medium">{selectedEmissaoDetail.remetenteCpfCnpj ? formatCpfCnpj(selectedEmissaoDetail.remetenteCpfCnpj) : '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Dados do Pacote e Frete</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Código Objeto</p>
                  <p className="font-medium">{selectedEmissaoDetail.codigoObjeto || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transportadora</p>
                  <p className="font-medium">{selectedEmissaoDetail.transportadora || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Serviço</p>
                  <p className="font-medium">{selectedEmissaoDetail.servico || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Valor</p>
                  <p className="font-medium text-green-600">{selectedEmissaoDetail.valor ? `R$ ${selectedEmissaoDetail.valor}` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Valor Postagem</p>
                  <p className="font-medium text-orange-600">{selectedEmissaoDetail.valorPostagem ? `R$ ${selectedEmissaoDetail.valorPostagem}` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <StatusBadgeEmissao 
                    status={selectedEmissaoDetail.status} 
                    mensagensErrorPostagem={selectedEmissaoDetail.mensagensErrorPostagem || ""} 
                    handleOnViewErroPostagem={() => {}} 
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dimensões (A×L×C)</p>
                  <p className="font-medium">
                    {selectedEmissaoDetail.embalagem?.altura || '-'}×{selectedEmissaoDetail.embalagem?.largura || '-'}×{selectedEmissaoDetail.embalagem?.comprimento || '-'} cm
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Peso</p>
                  <p className="font-medium">{selectedEmissaoDetail.embalagem?.peso || '-'} g</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Data Criação</p>
                  <p className="font-medium">
                    {selectedEmissaoDetail.criadoEm ? format(new Date(selectedEmissaoDetail.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {selectedEmissaoDetail.cliente && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nome</p>
                    <p className="font-medium">{selectedEmissaoDetail.cliente.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">CPF/CNPJ</p>
                    <p className="font-medium">{selectedEmissaoDetail.cliente.cpfCnpj ? formatCpfCnpj(selectedEmissaoDetail.cliente.cpfCnpj) : '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalCustom>
      )}
    </Content>
  );
}
