import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Content, type ContentButtonProps } from "../../Content";
import { EmissaoService } from "../../../../services/EmissaoService";
import { DataTable, type Column } from "../../../../components/DataTable";
import { Trash2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadgeEmissao } from "../../../../components/StatusBadgeEmissao";
import type { IEmissao } from "../../../../types/IEmissao";
import { formatCpfCnpj } from "../../../../utils/lib.formats";

const emissaoService = new EmissaoService();

export default function GerenciarEtiquetas() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    remetente: "",
    status: "",
    dataInicio: "",
    dataFim: ""
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["emissoes-gerenciar", page, appliedFilters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: 50,
        offset: (page - 1) * 50
      };
      
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.dataInicio) params.dataIni = appliedFilters.dataInicio;
      if (appliedFilters.dataFim) params.dataFim = appliedFilters.dataFim;
      if (appliedFilters.remetente) params.remetenteNome = appliedFilters.remetente;

      console.log('Parâmetros enviados para API:', params);
      const response = await emissaoService.getAll(params, 'admin');
      console.log('Quantidade de resultados:', response.data?.length);
      return response;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => 
        emissaoService.cancelarEmissao({ id })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Etiquetas excluídas com sucesso!");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    },
    onError: () => {
      toast.error("Erro ao excluir etiquetas");
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      const allIds = data.data.map((item: IEmissao) => item.id || "");
      setSelectedIds(allIds.filter(Boolean));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos uma etiqueta");
      return;
    }

    if (confirm(`Deseja realmente excluir ${selectedIds.length} etiqueta(s)?`)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { remetente: "", status: "", dataInicio: "", dataFim: "" };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const columns: Column<IEmissao>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={data?.data && selectedIds.length === data.data.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      accessor: (item: IEmissao) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id || "")}
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

  const buttons: ContentButtonProps[] = [
    {
      label: "Filtros",
      icon: <Filter className="h-4 w-4" />,
      onClick: () => setShowFilters(!showFilters),
      bgColor: "bg-gray-200 hover:bg-gray-300 text-gray-800"
    },
    {
      label: `Excluir Selecionadas (${selectedIds.length})`,
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      bgColor: selectedIds.length === 0 || deleteMutation.isPending ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"
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
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="PRE_POSTADO">Pré-postado</option>
                <option value="POSTADO">Postado</option>
                <option value="EM_TRANSITO">Em Trânsito</option>
                <option value="ENTREGUE">Entregue</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
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
        <span className="flex items-center px-4">
          Página {page}
        </span>
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
          onClick={() => setPage(p => p + 1)}
        >
          Próxima
        </button>
      </div>
    </Content>
  );
}
