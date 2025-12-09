import { Filter, Import, Plus, Printer, ReceiptText, BarChart3, Download, Package, ChevronLeft, ChevronRight, XCircle, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModalCustom } from '../../../components/modal';
import { ResponsiveTabMenu } from '../../../components/ResponsiveTabMenu';
import { StatusBadgeEmissao } from '../../../components/StatusBadgeEmissao';
import { useFetchQuery } from '../../../hooks/useFetchQuery';
import { useImprimirEtiquetaPDF } from '../../../hooks/useImprimirEtiquetaPDF';
import { useAuth } from '../../../providers/AuthContext';
import { useGlobalConfig } from '../../../providers/GlobalConfigContext';
import { useLoadingSpinner } from '../../../providers/LoadingSpinnerContext';
import { EmissaoService } from '../../../services/EmissaoService';
import type { IEmissao } from '../../../types/IEmissao';
import type { IResponse } from '../../../types/IResponse';
import { formatDateTime } from '../../../utils/date-utils';
import { exportEmissoesToExcel } from '../../../utils/exportToExcel';
import { FiltroEmissao } from './FiltroEmissao';
import { ModalViewDeclaracaoConteudo } from './ModalViewDeclaracaoConteudo';
import { ModalViewErroPostagem } from './ModalViewErroPostagem';
import { ModalViewPDF } from './ModalViewPDF';
import { DashboardEmissoes } from './DashboardEmissoes';
import { supabase } from '../../../integrations/supabase/client';
import { toast } from 'sonner';
export const ListaEmissoes = () => {
  const {
    user
  } = useAuth();
  const {
    setIsLoading
  } = useLoadingSpinner();
  const service = new EmissaoService();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalViewPDF, setIsModalViewPDF] = useState(false);
  const [isModalViewDeclaracaoConteudo, setIsModalViewDeclaracaoConteudo] = useState(false);
  const [isModalViewErroPostagem, setIsModalViewErroPostagem] = useState(false);
  const [erroPostagem, setErroPostagem] = useState<string | undefined>('');
  const [data, setData] = useState<IEmissao[]>([]);
  const [tab, setTab] = useState('PRE_POSTADO');
  const config = useGlobalConfig();
  const perPage = config.pagination.perPage;
  const [page, setPage] = useState<number>(1);
  const [etiqueta, setEtiqueta] = useState<{
    nome: string;
    dados: string;
  }>();
  const {
    onEmissaoImprimir
  } = useImprimirEtiquetaPDF();
  const {
    data: emissoes,
    isLoading,
    isError,
    refetch
  } = useFetchQuery<IResponse<IEmissao[]>>(['emissoes', searchParams.toString(), user?.email, page, tab], async () => {
    const params: {
      limit: number;
      offset: number;
      dataIni?: string;
      dataFim?: string;
      destinatario?: string;
      status?: string;
      codigoObjeto?: string;
    } = {
      limit: perPage,
      offset: (page - 1) * perPage
    };
    const dataIni = searchParams.get('dataIni') || undefined;
    const dataFim = searchParams.get('dataFim') || undefined;
    const destinatario = searchParams.get('destinatario') || undefined;
    const statusFromUrl = searchParams.get('status') || undefined;
    const codigoObjeto = searchParams.get('codigoObjeto') || undefined;
    if (dataIni) params.dataIni = dataIni;
    if (dataFim) params.dataFim = dataFim;
    if (destinatario) params.destinatario = destinatario;
    if (codigoObjeto) params.codigoObjeto = codigoObjeto;
    params.status = statusFromUrl || tab;
    const result = await service.getAll(params);
    return result;
  });
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    setSearchParams(params);
  }, [emissoes]);
  const handleOnPDF = async (emissao: IEmissao, mergePdf: boolean = false) => {
    const tipoEtiqueta = mergePdf ? 'merge' : 'etiqueta';
    try {
      const response = await onEmissaoImprimir(emissao, tipoEtiqueta, setIsLoading);
      if (response?.data) {
        setEtiqueta(response.data);
        setIsModalViewPDF(true);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };
  const handleOnViewErroPostagem = async (jsonContent?: string) => {
    setErroPostagem(jsonContent);
    setIsModalViewErroPostagem(true);
  };
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const handlerToggleFilter = () => {
    setIsFilterOpen(prev => !prev);
  };
  useEffect(() => {
    if (emissoes?.data) {
      setData(emissoes.data);
    }
  }, [emissoes]);
  const handlePageChange = async (pageNumber: number) => {
    setPage(pageNumber);
  };
  const handleExportToExcel = () => {
    if (data && data.length > 0) {
      exportEmissoesToExcel(data, 'emissoes');
    }
  };
  const handleCancelarEtiqueta = async (emissao: IEmissao) => {
    if (!emissao.codigoObjeto || !emissao.id) {
      toast.error('Dados insuficientes para cancelar');
      return;
    }
    if (!confirm(`Deseja realmente cancelar a etiqueta ${emissao.codigoObjeto}?`)) {
      return;
    }
    try {
      setIsLoading(true);
      const {
        error
      } = await supabase.functions.invoke('cancelar-etiqueta-admin', {
        body: {
          codigoObjeto: emissao.codigoObjeto,
          motivo: 'Cancelado pelo usuário',
          emissaoId: emissao.id
        }
      });
      if (error) {
        throw error;
      }
      toast.success('Etiqueta cancelada com sucesso!');
      refetch();
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast.error(error.message || 'Erro ao cancelar etiqueta');
    } finally {
      setIsLoading(false);
    }
  };
  const totalPages = emissoes?.meta?.totalPages || Math.ceil((emissoes?.total || 0) / perPage);
  return <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
            {/* Header Premium */}
            <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg">
                                <Package className="h-6 w-6 text-primary-foreground text-slate-50" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">Pré-Postagem</h1>
                                <p className="text-sm text-muted-foreground">Gerencie e acompanhe seus envios</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            <a href="/app/emissao/adicionar" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg text-sm font-semibold text-slate-50">
                                <Plus className="h-4 w-4" />
                                Nova Etiqueta
                            </a>
                            <a href="/app/emissao/importacao" className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all text-sm font-medium">
                                <Import className="h-4 w-4" />
                                <span className="hidden sm:inline">Importar</span>
                            </a>
                            <button onClick={handleExportToExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                                <button onClick={() => setShowDashboard(!showDashboard)} className={`p-2 rounded-lg transition-all ${showDashboard ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Dashboard">
                                    <BarChart3 className="h-4 w-4" />
                                </button>
                                <button onClick={handlerToggleFilter} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all" title="Filtros">
                                    <Filter className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Dashboard */}
                {showDashboard && emissoes?.data && emissoes.data.length > 0 && <DashboardEmissoes emissoes={emissoes.data} />}

                {/* Tabs e Tabela */}
                <ResponsiveTabMenu tab={tab} setTab={setTab}>
                    {isLoading ? <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div> : isError ? <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p>Erro ao carregar dados</p>
                        </div> : !emissoes?.data || emissoes.data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border rounded-xl">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Nenhuma etiqueta encontrada</p>
                            <p className="text-sm">Crie sua primeira etiqueta clicando em "Nova Etiqueta"</p>
                        </div> : <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transportadora</th>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Destinatário</th>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                                            <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.map((row, idx) => <tr key={row.id} className={`hover:bg-muted/40 transition-all ${idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}`}>
                                                <td className="px-5 py-4">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                                                        <span className="font-mono text-sm font-bold text-primary">{row.codigoObjeto}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-semibold text-sm text-foreground">{row.transportadora}</span>
                                                        {row.servico && <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium w-fit">
                                                                {row.servico}
                                                            </span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 hidden md:table-cell">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-sm text-foreground truncate max-w-[180px]">{row.destinatario?.nome}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {row.destinatario?.endereco?.localidade} - {row.destinatario?.endereco?.uf}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold">
                                                        R$ {row.valor}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadgeEmissao status={row.status} mensagensErrorPostagem={row.mensagensErrorPostagem} handleOnViewErroPostagem={handleOnViewErroPostagem} />
                                                </td>
                                                <td className="px-5 py-4 hidden lg:table-cell">
                                                    <span className="text-sm text-muted-foreground">{formatDateTime(row.criadoEm)}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a href={`/app/emissao/detail/${row.id}`} className="p-2.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all group" title="Ver detalhes">
                                                            <ReceiptText className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                                                        </a>
                                                        {!row.mensagensErrorPostagem && row.status === 'PRE_POSTADO' && <>
                                                                <button onClick={() => handleOnPDF(row, true)} className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all group" title="Imprimir etiqueta">
                                                                    <Printer className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                                                                </button>
                                                                <button onClick={() => handleCancelarEtiqueta(row)} className="p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all group" title="Cancelar etiqueta">
                                                                    <XCircle className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                                                                </button>
                                                            </>}
                                                    </div>
                                                </td>
                                            </tr>)}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginação */}
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                                <span className="text-sm text-muted-foreground">
                                    Página {page} de {totalPages || 1} • {emissoes?.total || data.length} registros
                                </span>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                        Anterior
                                    </button>
                                    <button className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled={page >= (totalPages || 1)} onClick={() => handlePageChange(page + 1)}>
                                        Próxima
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>}
                </ResponsiveTabMenu>
            </div>

            {/* Modais */}
            <ModalViewDeclaracaoConteudo isOpen={isModalViewDeclaracaoConteudo} htmlContent={etiqueta?.dados || ''} onCancel={() => setIsModalViewDeclaracaoConteudo(false)} />
            <ModalViewPDF isOpen={isModalViewPDF} base64={etiqueta?.dados || ''} onCancel={() => setIsModalViewPDF(false)} />
            <ModalViewErroPostagem isOpen={isModalViewErroPostagem} jsonContent={erroPostagem || ''} onCancel={() => setIsModalViewErroPostagem(false)} />

            {isFilterOpen && <ModalCustom title="Filtrar Envios" description="Filtre as etiquetas de acordo com os parâmetros abaixo." onCancel={handlerToggleFilter}>
                    <FiltroEmissao onCancel={handlerToggleFilter} />
                </ModalCustom>}
        </div>;
};