import { useState } from "react";
import { isValid as isValidCpf, strip as stripCpf, generate as generateCpf } from "@fnando/cpf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Content, type ContentButtonProps } from "../../Content";
import { EmissaoService } from "../../../../services/EmissaoService";
import { DataTable, type Column } from "../../../../components/DataTable";
import { Trash2, Filter, X, DollarSign, Eye, RefreshCw, FileText, User, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import { ModalCustom } from "../../../../components/modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadgeEmissao } from "../../../../components/StatusBadgeEmissao";
import type { IEmissao } from "../../../../types/IEmissao";
import { formatCpfCnpj } from "../../../../utils/lib.formats";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { ModalAtualizarPrecosEmMassa } from "./ModalAtualizarPrecosEmMassa";
import { supabase } from "../../../../integrations/supabase/client";

const emissaoService = new EmissaoService();

export default function GerenciarEtiquetas() {
  const { setIsLoading: setGlobalLoading } = useLoadingSpinner();
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
  const [showRegerarModal, setShowRegerarModal] = useState(false);
  const [editableEmissao, setEditableEmissao] = useState<any>(null);
  const queryClient = useQueryClient();

  // Query para buscar dados da API externa
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

      return response;
    }
  });

  // Query para buscar etiquetas pendentes de correção do Supabase
  const { data: etiquetasPendentes, isLoading: isLoadingPendentes } = useQuery({
    queryKey: ["etiquetas-pendentes-correcao", page, appliedFilters],
    queryFn: async () => {
      let query = supabase
        .from('etiquetas_pendentes_correcao')
        .select('*', { count: 'exact' })
        .range((page - 1) * 50, page * 50 - 1)
        .order('criado_em', { ascending: false });

      // Aplicar filtros
      if (appliedFilters.remetente) {
        query = query.ilike('remetente_nome', `%${appliedFilters.remetente}%`);
      }
      if (appliedFilters.dataInicio) {
        query = query.gte('criado_em', appliedFilters.dataInicio);
      }
      if (appliedFilters.dataFim) {
        query = query.lte('criado_em', appliedFilters.dataFim);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar etiquetas pendentes:', error);
        return { data: [], count: 0 };
      }

      console.log('Etiquetas pendentes de correção:', data?.length);
      return { data: data || [], count: count || 0 };
    }
  });

  // Combinar dados da API externa com dados locais do Supabase
  const combinedData = {
    data: [
      ...(data?.data || []),
      ...(etiquetasPendentes?.data?.map((pendente: any) => ({
        id: pendente.id,
        codigoObjeto: null, // Etiquetas pendentes ainda não têm código
        transportadora: pendente.servico_frete || '-',
        servico: pendente.servico_frete,
        remetenteNome: pendente.remetente_nome,
        remetenteCpfCnpj: pendente.remetente_cpf_cnpj,
        remetenteLocalidade: '',
        remetenteUf: '',
        cliente: { nome: '', cpfCnpj: '' },
        destinatario: {
          nome: pendente.destinatario_nome,
          cpfCnpj: pendente.destinatario_cpf_cnpj,
          celular: pendente.destinatario_celular,
          endereco: {
            cep: pendente.destinatario_cep,
            logradouro: pendente.destinatario_logradouro,
            numero: pendente.destinatario_numero,
            complemento: pendente.destinatario_complemento,
            bairro: pendente.destinatario_bairro,
            localidade: pendente.destinatario_cidade,
            uf: pendente.destinatario_estado,
          }
        },
        embalagem: {
          altura: pendente.altura,
          largura: pendente.largura,
          comprimento: pendente.comprimento,
          peso: pendente.peso,
        },
        valorDeclarado: pendente.valor_declarado,
        observacao: pendente.observacao,
        status: 'ERRO_PENDENTE_CORRECAO',
        mensagensErrorPostagem: pendente.motivo_erro,
        criadoEm: pendente.criado_em,
      })) || [])
    ],
    total: (data?.total || 0) + (etiquetasPendentes?.count || 0)
  };

  // Atualizar o total filtrado
  const totalCombinado = combinedData.total;
  if (filteredTotal !== totalCombinado) {
    setFilteredTotal(totalCombinado);
  }

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

    // Preparar dados editáveis incluindo remetente
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
    });
    setShowRegerarModal(true);
  };

  const gerarCpfSemZeroInicial = () => {
    // Gerar CPF válido que NÃO comece com zero (para não perder dígito ao converter para Number)
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
    
    // Verificar se CPF começa com zero (problemático ao converter para Number)
    if (cpfLimpo.startsWith('0')) {
      const novoCpf = gerarCpfSemZeroInicial();
      setEditableEmissao({
        ...editableEmissao,
        destinatarioCpfCnpj: novoCpf
      });
      toast.warning(`CPF começa com zero (perde dígito ao enviar). Novo CPF gerado: ${novoCpf}`, { duration: 5000 });
      return;
    }
    
    if (!cpfLimpo || cpfLimpo.length !== 11 || !isValidCpf(cpfLimpo)) {
      const novoCpf = gerarCpfSemZeroInicial();
      setEditableEmissao({
        ...editableEmissao,
        destinatarioCpfCnpj: novoCpf
      });
      toast.success(`CPF inválido! Gerado novo CPF válido: ${novoCpf}`, { duration: 5000 });
    } else {
      toast.success("CPF válido! ✓", { duration: 3000 });
    }
  };

  const handleConfirmarRegerar = async () => {
    if (!editableEmissao) return;

    try {
      setGlobalLoading(true);
      
      // Preparar dados no formato EXATO do endpoint de criação em massa
      const dadosParaImportar = {
        cpfCnpj: editableEmissao.remetenteCpfCnpj?.replace(/\D/g, ''), // Usar remetente da etiqueta original
        data: [
          {
            nomeDestinatario: editableEmissao.destinatarioNome?.trim(),
            cpfCnpj: Number(editableEmissao.destinatarioCpfCnpj?.replace(/\D/g, '')), // API espera NUMBER!
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
            valor_frete: 0, // Será calculado pela API
            servico_frete: "PAC", // Padrão, será recalculado pela API
            observacao: editableEmissao.observacao?.trim() || ''
          }
        ]
      };

      console.log('Enviando dados para regerar:', dadosParaImportar);

      // Chamar API de importação em massa
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
        
        // Se erro de CPF inválido, gerar novo CPF válido e tentar novamente
        if (errorData.error?.message?.includes('cpfCnpj')) {
          console.warn('CPF rejeitado pela API. Gerando novo CPF válido (sem zero inicial)...');
          const novoCpf = gerarCpfSemZeroInicial();
          
          // Atualizar o estado com o novo CPF
          setEditableEmissao({
            ...editableEmissao,
            destinatarioCpfCnpj: novoCpf
          });
          
          // Reenviar com novo CPF
          dadosParaImportar.data[0].cpfCnpj = Number(novoCpf);
          
          const retryResponse = await fetch('https://envios.brhubb.com.br/api/importacao/multipla', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'API-Version': '3.0.0'
            },
            body: JSON.stringify(dadosParaImportar)
          });
          
          if (!retryResponse.ok) {
            const retryError = await retryResponse.json();
            throw new Error(retryError.error?.message || retryError.message || 'Erro ao regerar etiqueta');
          }
          
          await retryResponse.json();
          toast.success(`Etiqueta regerada com sucesso! (CPF corrigido: ${novoCpf})`);
          setShowRegerarModal(false);
          setEditableEmissao(null);
          queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
          setGlobalLoading(false);
          return;
        }
        
        const errorMsg = errorData.error?.message || errorData.message || 'Erro ao regerar etiqueta';
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('Resultado da regeração:', result);

      toast.success('Etiqueta regerada com sucesso!');
      setShowRegerarModal(false);
      setEditableEmissao(null);
      setSelectedIds([]);
      setSelectAllMode('none');
      queryClient.invalidateQueries({ queryKey: ["emissoes-gerenciar"] });
    } catch (error: any) {
      console.error('Erro ao regerar etiqueta:', error);
      toast.error(error.message || "Erro ao regerar etiqueta");
    } finally {
      setGlobalLoading(false);
    }
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

      {showRegerarModal && editableEmissao && (
        <ModalCustom
          onCancel={() => {
            setShowRegerarModal(false);
            setEditableEmissao(null);
          }}
          title="Regerar Etiqueta"
          description="Edite os dados conforme necessário e gere uma nova etiqueta"
          size="large"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-300">Remetente (Original)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nome</p>
                  <p className="font-medium text-slate-700 dark:text-slate-200">{editableEmissao.remetenteNome || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">CPF/CNPJ</p>
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {editableEmissao.remetenteCpfCnpj ? formatCpfCnpj(editableEmissao.remetenteCpfCnpj) : '-'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                ℹ️ O remetente será mantido da etiqueta original
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Destinatário</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Nome</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.destinatarioNome}
                    onChange={(e) => setEditableEmissao({...editableEmissao, destinatarioNome: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">CPF/CNPJ</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                      value={editableEmissao.destinatarioCpfCnpj}
                      onChange={(e) => setEditableEmissao({...editableEmissao, destinatarioCpfCnpj: e.target.value})}
                    />
                    <button
                      onClick={handleValidarCpf}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                      type="button"
                    >
                      Validar CPF
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Celular</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.destinatarioCelular}
                    onChange={(e) => setEditableEmissao({...editableEmissao, destinatarioCelular: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">CEP</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.cep}
                    onChange={(e) => setEditableEmissao({...editableEmissao, cep: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Logradouro</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.logradouro}
                    onChange={(e) => setEditableEmissao({...editableEmissao, logradouro: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Número</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.numero}
                    onChange={(e) => setEditableEmissao({...editableEmissao, numero: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Complemento</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.complemento}
                    onChange={(e) => setEditableEmissao({...editableEmissao, complemento: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Bairro</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.bairro}
                    onChange={(e) => setEditableEmissao({...editableEmissao, bairro: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Cidade</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.localidade}
                    onChange={(e) => setEditableEmissao({...editableEmissao, localidade: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">UF</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.uf}
                    onChange={(e) => setEditableEmissao({...editableEmissao, uf: e.target.value})}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Dimensões do Pacote</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.altura}
                    onChange={(e) => setEditableEmissao({...editableEmissao, altura: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Largura (cm)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.largura}
                    onChange={(e) => setEditableEmissao({...editableEmissao, largura: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Comprimento (cm)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.comprimento}
                    onChange={(e) => setEditableEmissao({...editableEmissao, comprimento: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Peso (g)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.peso}
                    onChange={(e) => setEditableEmissao({...editableEmissao, peso: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Outros Dados</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Valor Declarado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    value={editableEmissao.valorDeclarado}
                    onChange={(e) => setEditableEmissao({...editableEmissao, valorDeclarado: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Observação</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-gray-600"
                    rows={3}
                    value={editableEmissao.observacao}
                    onChange={(e) => setEditableEmissao({...editableEmissao, observacao: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRegerarModal(false);
                  setEditableEmissao(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRegerar}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regerar Etiqueta
              </button>
            </div>
          </div>
        </ModalCustom>
      )}
    </Content>
  );
}
