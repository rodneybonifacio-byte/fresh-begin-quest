import { useState } from "react";
import { isValid as isValidCpf, strip as stripCpf, generate as generateCpf } from "@fnando/cpf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmissaoService } from "../../../../services/EmissaoService";
import { supabase } from "../../../../integrations/supabase/client";
import { Trash2, Filter, X, DollarSign, Eye, RefreshCw, ChevronLeft, ChevronRight, Search, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { ModalCustom } from "../../../../components/modal";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<Record<string, { codigoObjeto: string }>>({});
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
  const [showRegerarModal, setShowRegerarModal] = useState(false);
  const [editableEmissao, setEditableEmissao] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: queryResult, isLoading } = useQuery({
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

      const response = await emissaoService.getAll(params, 'admin');

      // Buscar pendentes via backend function (service role)
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) throw new Error('Token não encontrado - faça login novamente');

      const { data: pendentesResp, error: pendentesErr } = await supabase.functions.invoke('etiquetas-pendentes-listar', {
        headers: { 'x-brhub-authorization': `Bearer ${token}` },
        body: {
          filters: {
            remetente: appliedFilters.remetente || null,
            dataInicio: appliedFilters.dataInicio || null,
            dataFim: appliedFilters.dataFim || null,
          },
        },
      });

      if (pendentesErr) throw new Error(pendentesErr.message);

      const pendentesData = (pendentesResp as any)?.data || [];
      const pendentesCount = (pendentesResp as any)?.count || pendentesData.length;

      // Converter etiquetas pendentes para formato IEmissao
      const pendentesFormatted: IEmissao[] = (pendentesData || []).map((p: any) => ({
        id: p.id,
        codigoObjeto: 'PENDENTE_' + p.id.substring(0, 8),
        transportadora: 'Correios',
        servico: p.servico_frete || 'PAC',
        remetenteId: '',
        remetenteNome: p.remetente_nome || '',
        remetenteCpfCnpj: p.remetente_cpf_cnpj || '',
        cliente: { nome: 'PENDENTE CORREÇÃO', cpfCnpj: '' },
        destinatario: {
          nome: p.destinatario_nome,
          cpfCnpj: p.destinatario_cpf_cnpj || '',
          celular: p.destinatario_celular || '',
          endereco: {
            cep: p.destinatario_cep,
            logradouro: p.destinatario_logradouro || '',
            numero: p.destinatario_numero || '',
            complemento: p.destinatario_complemento || '',
            bairro: p.destinatario_bairro || '',
            localidade: p.destinatario_cidade || '',
            uf: p.destinatario_estado || ''
          }
        },
        embalagem: {
          altura: p.altura || 0,
          largura: p.largura || 0,
          comprimento: p.comprimento || 0,
          peso: p.peso || 0
        },
        valorDeclarado: p.valor_declarado || 0,
        valorNotaFiscal: 0,
        observacao: p.observacao || '',
        status: 'ERRO_PENDENTE_CORRECAO',
        mensagensErrorPostagem: p.motivo_erro,
        criadoEm: p.criado_em,
        cienteObjetoNaoProibido: true,
        cotacao: null,
        logisticaReversa: false,
        _isPendente: true
      } as any));

      const combinedData = [...(response.data || []), ...pendentesFormatted];
      const totalCombined = (response.total || response.data?.length || 0) + (pendentesCount || 0);
      setFilteredTotal(totalCombined);

      return {
        data: combinedData,
        total: totalCombined
      };
    }
  });

  const data = queryResult?.data || [];

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results: any[] = [];
      const errors: any[] = [];
      
      for (const id of ids) {
        const meta = selectedMeta[id];
        if (!meta?.codigoObjeto) {
          errors.push({ id, error: 'Sem codigoObjeto' });
          continue;
        }

        // Verificar se é pendente de correção (começa com PENDENTE_)
        if (meta.codigoObjeto.startsWith('PENDENTE_')) {
          const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
          if (!token) {
            errors.push({ id, error: 'Token não encontrado' });
            continue;
          }

          const { error } = await supabase.functions.invoke('etiquetas-pendentes-deletar', {
            headers: { 'x-brhub-authorization': `Bearer ${token}` },
            body: { id },
          });
          
          if (error) {
            errors.push({ id, error: error.message });
          } else {
            results.push({ id, success: true });
          }
          continue;
        }

        try {
          console.log('🔴 Cancelando etiqueta via edge function:', { id, codigoObjeto: meta.codigoObjeto });
          
          const { data: responseData, error } = await supabase.functions.invoke('cancelar-etiqueta-admin', {
            body: {
              codigoObjeto: meta.codigoObjeto,
              motivo: 'Cancelado via Gerenciar Etiquetas',
              emissaoId: id,
            },
          });

          if (error) {
            console.error(`Erro ao cancelar ${id}:`, error);
            errors.push({ id, error: error.message });
          } else {
            console.log('✅ Etiqueta cancelada:', responseData);
            results.push(responseData);
          }
        } catch (err: any) {
          console.error(`Erro ao cancelar ${id}:`, err);
          errors.push({ id, error: err.message || err });
        }
      }
      
      return { results, errors };
    },
    onSuccess: (data) => {
      const { results, errors } = data;
      if (errors.length > 0) {
        toast.warning(`${results.length} canceladas. ${errors.length} com erro.`);
        console.error('Erros:', errors);
      } else {
        toast.success(`${results.length} etiqueta(s) cancelada(s)!`);
      }
      setSelectedIds([]);
      setSelectedMeta({});
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    },
    onError: (error) => {
      console.error('Erro geral:', error);
      toast.error("Erro ao cancelar etiquetas");
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      const pageIds: string[] = [];
      const meta: Record<string, { codigoObjeto: string }> = {};

      data.forEach((item: IEmissao) => {
        if (!item.id || !item.codigoObjeto) return;
        pageIds.push(item.id);
        meta[item.id] = { codigoObjeto: item.codigoObjeto };
      });

      setSelectedIds(pageIds);
      setSelectedMeta(meta);
    } else {
      setSelectedIds([]);
      setSelectedMeta({});
    }
  };

  const handleSelectOne = (id: string, checked: boolean, codigoObjeto?: string) => {
    if (checked) {
      if (!selectedIds.includes(id)) {
        setSelectedIds(prev => [...prev, id]);
      }
      if (codigoObjeto) {
        setSelectedMeta(prev => ({
          ...prev,
          [id]: { codigoObjeto },
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

    if (confirm(`Deseja realmente cancelar ${selectedIds.length} etiqueta(s)?`)) {
      deleteMutation.mutate(selectedIds);
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

  const handleRegerarEtiqueta = () => {
    if (selectedIds.length !== 1) {
      toast.warning("Selecione apenas uma etiqueta para regerar");
      return;
    }
    
    const emissao = data?.find((e: IEmissao) => e.id === selectedIds[0]);
    if (!emissao) {
      toast.error("Etiqueta não encontrada");
      return;
    }

    setEditableEmissao({
      remetenteId: emissao.remetenteId,
      remetenteNome: emissao.remetenteNome || '',
      remetenteCpfCnpj: emissao.remetenteCpfCnpj || '',
      destinatarioNome: emissao.destinatario?.nome || '',
      destinatarioCpfCnpj: emissao.destinatario?.cpfCnpj || '',
      destinatarioCelular: emissao.destinatario?.celular || '',
      cep: emissao.destinatario?.endereco?.cep || '',
      logradouro: emissao.destinatario?.endereco?.logradouro || '',
      numero: emissao.destinatario?.endereco?.numero || '',
      complemento: emissao.destinatario?.endereco?.complemento || '',
      bairro: emissao.destinatario?.endereco?.bairro || '',
      localidade: emissao.destinatario?.endereco?.localidade || '',
      uf: emissao.destinatario?.endereco?.uf || '',
      altura: emissao.embalagem?.altura || 0,
      largura: emissao.embalagem?.largura || 0,
      comprimento: emissao.embalagem?.comprimento || 0,
      peso: emissao.embalagem?.peso || 0,
      valorDeclarado: emissao.valorDeclarado || 0,
      observacao: emissao.observacao || '',
      servicoFrete: emissao.servico?.toUpperCase()?.includes('SEDEX') ? 'SEDEX' : 'PAC',
    });
    setShowRegerarModal(true);
  };

  const gerarCpfSemZeroInicial = () => {
    let cpf = stripCpf(generateCpf());
    let tentativas = 0;
    while (cpf.startsWith('0') && tentativas < 20) {
      cpf = stripCpf(generateCpf());
      tentativas++;
    }
    return cpf;
  };

  const handleValidarCpf = () => {
    if (!editableEmissao) return;
    
    const cpfLimpo = editableEmissao.destinatarioCpfCnpj?.replace(/\D/g, '') || '';
    
    if (cpfLimpo.startsWith('0')) {
      const novoCpf = gerarCpfSemZeroInicial();
      setEditableEmissao({ ...editableEmissao, destinatarioCpfCnpj: novoCpf });
      toast.warning(`CPF começa com zero. Novo CPF gerado: ${novoCpf}`);
      return;
    }
    
    if (!cpfLimpo || cpfLimpo.length !== 11 || !isValidCpf(cpfLimpo)) {
      const novoCpf = gerarCpfSemZeroInicial();
      setEditableEmissao({ ...editableEmissao, destinatarioCpfCnpj: novoCpf });
      toast.success(`CPF inválido! Novo CPF gerado: ${novoCpf}`);
    } else {
      toast.success("CPF válido! ✓");
    }
  };

  const handleConfirmarRegerar = async () => {
    if (!editableEmissao) return;

    try {
      setGlobalLoading(true);
      
      const dadosParaImportar = {
        cpfCnpj: editableEmissao.remetenteCpfCnpj?.replace(/\D/g, ''),
        data: [{
          nomeDestinatario: editableEmissao.destinatarioNome?.trim(),
          cpfCnpj: Number(editableEmissao.destinatarioCpfCnpj?.replace(/\D/g, '')),
          telefone: editableEmissao.destinatarioCelular?.replace(/\D/g, ''),
          cep: editableEmissao.cep?.replace(/\D/g, ''),
          logradouro: editableEmissao.logradouro?.trim(),
          numero: Number(editableEmissao.numero?.trim() || 0),
          complemento: editableEmissao.complemento?.trim() || '',
          bairro: editableEmissao.bairro?.trim(),
          cidade: editableEmissao.localidade?.trim(),
          estado: editableEmissao.uf?.toUpperCase().trim(),
          altura: Number(editableEmissao.altura),
          largura: Number(editableEmissao.largura),
          comprimento: Number(editableEmissao.comprimento),
          peso: Number(editableEmissao.peso),
          valor_declarado: Number(editableEmissao.valorDeclarado),
          valor_frete: 0,
          servico_frete: editableEmissao.servicoFrete || "PAC",
          observacao: editableEmissao.observacao?.trim() || ''
        }]
      };

      const response = await fetch('https://envios.brhubb.com.br/api/importacao/multipla', {
        method: 'POST',
        headers: {
          'API-Version': '3.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaImportar)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erro ao regerar etiqueta');
      }

      toast.success('Etiqueta regerada com sucesso!');
      setShowRegerarModal(false);
      setEditableEmissao(null);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao regerar etiqueta");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Gerenciar Etiquetas</h1>
                <p className="text-sm text-muted-foreground">Visualize, filtre e exclua etiquetas</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              
              {selectedIds.length === 1 && (
                <>
                  <button
                    onClick={() => {
                      const emissao = data?.find((e: IEmissao) => e.id === selectedIds[0]);
                      if (emissao) {
                        setSelectedEmissaoDetail(emissao);
                        setShowDetailModal(true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Detalhes
                  </button>
                  <button
                    onClick={handleRegerarEtiqueta}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regerar
                  </button>
                </>
              )}

              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={() => setShowModalAtualizarPrecos(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <DollarSign className="h-4 w-4" />
                    Atualizar Preços ({selectedIds.length})
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? 'Cancelando...' : `Cancelar (${selectedIds.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros */}
        {showFilters && (
          <div className="bg-card border rounded-xl p-6 mb-6 shadow-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros de Busca
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Remetente</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="Nome do remetente"
                  value={filters.remetente}
                  onChange={(e) => setFilters({ ...filters, remetente: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="space-y-1 border rounded-lg p-3 bg-background max-h-40 overflow-y-auto">
                  {['PRE_POSTADO', 'POSTADO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO'].map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleStatusChange(status)}
                        className="rounded"
                      />
                      <span className="text-sm">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                <X className="h-4 w-4" />
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Indicadores de seleção e filtros ativos */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{filteredTotal}</span> etiquetas encontradas
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              <span>{selectedIds.length} selecionadas</span>
              <button 
                onClick={() => { setSelectedIds([]); setSelectedMeta({}); }}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma etiqueta encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={data.length > 0 && selectedIds.length === data.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Transportadora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Remetente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Destinatário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((item: IEmissao) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(item.id || '') ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id || '')}
                          onChange={(e) => handleSelectOne(item.id || '', e.target.checked, item.codigoObjeto)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{item.codigoObjeto || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.transportadora}</span>
                          {item.servico && <span className="text-xs text-muted-foreground">{item.servico}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[150px]">{item.remetenteNome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[150px]">{item.destinatario?.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.destinatario?.endereco?.localidade} - {item.destinatario?.endereco?.uf}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(item as any)._isPendente ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-xs font-medium w-fit">
                            <AlertTriangle size={12} />
                            <span>PENDENTE</span>
                          </div>
                        ) : (
                          <StatusBadgeEmissao status={item.status} mensagensErrorPostagem={item.mensagensErrorPostagem || ""} handleOnViewErroPostagem={() => {}} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.criadoEm ? format(new Date(item.criadoEm), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Página {page} • {data?.length || 0} de {filteredTotal} registros
          </span>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              className="flex items-center gap-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!data?.length || data.length < 50}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalAtualizarPrecosEmMassa
        isOpen={showModalAtualizarPrecos}
        selectedIds={selectedIds}
        onClose={() => setShowModalAtualizarPrecos(false)}
        onSuccess={() => {
          setSelectedIds([]);
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
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Destinatário</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedEmissaoDetail.destinatario?.nome || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{formatCpfCnpj(selectedEmissaoDetail.destinatario?.cpfCnpj || '')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Endereço</p>
                  <p className="font-medium">
                    {selectedEmissaoDetail.destinatario?.endereco?.logradouro}, {selectedEmissaoDetail.destinatario?.endereco?.numero}
                    {selectedEmissaoDetail.destinatario?.endereco?.complemento && ` - ${selectedEmissaoDetail.destinatario.endereco.complemento}`}
                    <br />
                    {selectedEmissaoDetail.destinatario?.endereco?.bairro}, {selectedEmissaoDetail.destinatario?.endereco?.localidade}-{selectedEmissaoDetail.destinatario?.endereco?.uf}
                    {' '}{selectedEmissaoDetail.destinatario?.endereco?.cep}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Remetente</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedEmissaoDetail.remetenteNome || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{formatCpfCnpj(selectedEmissaoDetail.remetenteCpfCnpj || '')}</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Envio</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Código</p>
                  <p className="font-medium font-mono">{selectedEmissaoDetail.codigoObjeto || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedEmissaoDetail.status || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Declarado</p>
                  <p className="font-medium">R$ {(selectedEmissaoDetail.valorDeclarado || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </ModalCustom>
      )}

      {showRegerarModal && editableEmissao && (
        <ModalCustom
          onCancel={() => {
            setShowRegerarModal(false);
            setEditableEmissao(null);
          }}
          title="Regerar Etiqueta"
          size="large"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Remetente (fixo)</h4>
              <p className="text-sm">{editableEmissao.remetenteNome} - {formatCpfCnpj(editableEmissao.remetenteCpfCnpj)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome Destinatário</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.destinatarioNome}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, destinatarioNome: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CPF/CNPJ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-lg bg-background"
                    value={editableEmissao.destinatarioCpfCnpj}
                    onChange={(e) => setEditableEmissao({ ...editableEmissao, destinatarioCpfCnpj: e.target.value })}
                  />
                  <button
                    onClick={handleValidarCpf}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Validar
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Celular</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.destinatarioCelular}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, destinatarioCelular: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CEP</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.cep}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, cep: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Logradouro</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.logradouro}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, logradouro: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Número</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.numero}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, numero: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Complemento</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.complemento}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, complemento: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bairro</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.bairro}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, bairro: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cidade</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.localidade}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, localidade: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">UF</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.uf}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, uf: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Altura (cm)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.altura}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, altura: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Largura (cm)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.largura}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, largura: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Comprimento (cm)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.comprimento}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, comprimento: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Peso (g)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.peso}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, peso: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Serviço de Frete</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.servicoFrete}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, servicoFrete: e.target.value })}
                >
                  <option value="PAC">PAC</option>
                  <option value="SEDEX">SEDEX</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor Declarado (R$)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  value={editableEmissao.valorDeclarado}
                  onChange={(e) => setEditableEmissao({ ...editableEmissao, valorDeclarado: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowRegerarModal(false);
                  setEditableEmissao(null);
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRegerar}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Regerar Etiqueta
              </button>
            </div>
          </div>
        </ModalCustom>
      )}
    </div>
  );
}
