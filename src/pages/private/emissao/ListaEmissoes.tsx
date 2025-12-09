import { Filter, Import, Plus, Printer, ReceiptText, BarChart3, Download, Package, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
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
    const { user } = useAuth();
    const { setIsLoading } = useLoadingSpinner();
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

    const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string }>();
    const { onEmissaoImprimir } = useImprimirEtiquetaPDF();

    const {
        data: emissoes,
        isLoading,
        isError,
        refetch,
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
            offset: (page - 1) * perPage,
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
        setIsFilterOpen((prev) => !prev);
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
            const { error } = await supabase.functions.invoke('cancelar-etiqueta-admin', {
                body: {
                    codigoObjeto: emissao.codigoObjeto,
                    motivo: 'Cancelado pelo usuário',
                    emissaoId: emissao.id,
                },
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

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Pré-Postagem</h1>
                                <p className="text-sm text-muted-foreground">Gerencie suas etiquetas de envio</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <a
                                href="/app/emissao/adicionar"
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                Nova Etiqueta
                            </a>
                            <a
                                href="/app/emissao/importacao"
                                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                            >
                                <Import className="h-4 w-4" />
                                Importar
                            </a>
                            <button
                                onClick={handleExportToExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                                <Download className="h-4 w-4" />
                                Exportar
                            </button>
                            <button
                                onClick={() => setShowDashboard(!showDashboard)}
                                className={`p-2 rounded-lg transition-colors ${showDashboard ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}
                                title="Mostrar/Ocultar Dashboard"
                            >
                                <BarChart3 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handlerToggleFilter}
                                className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                title="Filtros"
                            >
                                <Filter className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Dashboard */}
                {showDashboard && emissoes?.data && emissoes.data.length > 0 && (
                    <DashboardEmissoes emissoes={emissoes.data} />
                )}

                {/* Tabs e Tabela */}
                <ResponsiveTabMenu tab={tab} setTab={setTab}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p>Erro ao carregar dados</p>
                        </div>
                    ) : !emissoes?.data || emissoes.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border rounded-xl">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Nenhuma etiqueta encontrada</p>
                            <p className="text-sm">Crie sua primeira etiqueta clicando em "Nova Etiqueta"</p>
                        </div>
                    ) : (
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Código</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Transportadora</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Destinatário</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Valor</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Data</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.map((row) => (
                                            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-sm font-semibold text-primary">{row.codigoObjeto}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{row.transportadora}</span>
                                                        {row.servico && (
                                                            <span className="text-xs text-muted-foreground">{row.servico}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm truncate max-w-[150px]">{row.destinatario?.nome}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {row.destinatario?.endereco?.localidade} - {row.destinatario?.endereco?.uf}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-green-600">R$ {row.valor}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadgeEmissao
                                                        status={row.status}
                                                        mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                        handleOnViewErroPostagem={handleOnViewErroPostagem}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                                                    {formatDateTime(row.criadoEm)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a
                                                            href={`/app/emissao/detail/${row.id}`}
                                                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                            title="Ver detalhes"
                                                        >
                                                            <ReceiptText className="h-4 w-4 text-purple-600" />
                                                        </a>
                                                        {!row.mensagensErrorPostagem && row.status === 'PRE_POSTADO' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOnPDF(row, true)}
                                                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                                    title="Imprimir etiqueta"
                                                                >
                                                                    <Printer className="h-4 w-4 text-blue-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelarEtiqueta(row)}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Cancelar etiqueta"
                                                                >
                                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginação */}
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                                <span className="text-sm text-muted-foreground">
                                    Página {page} de {totalPages || 1} • {emissoes?.total || data.length} registros
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        disabled={page === 1}
                                        onClick={() => handlePageChange(page - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Anterior
                                    </button>
                                    <button
                                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        disabled={page >= (totalPages || 1)}
                                        onClick={() => handlePageChange(page + 1)}
                                    >
                                        Próxima
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </ResponsiveTabMenu>
            </div>

            {/* Modais */}
            <ModalViewDeclaracaoConteudo
                isOpen={isModalViewDeclaracaoConteudo}
                htmlContent={etiqueta?.dados || ''}
                onCancel={() => setIsModalViewDeclaracaoConteudo(false)}
            />
            <ModalViewPDF isOpen={isModalViewPDF} base64={etiqueta?.dados || ''} onCancel={() => setIsModalViewPDF(false)} />
            <ModalViewErroPostagem isOpen={isModalViewErroPostagem} jsonContent={erroPostagem || ''} onCancel={() => setIsModalViewErroPostagem(false)} />

            {isFilterOpen && (
                <ModalCustom title="Filtrar Envios" description="Filtre as etiquetas de acordo com os parâmetros abaixo." onCancel={handlerToggleFilter}>
                    <FiltroEmissao onCancel={handlerToggleFilter} />
                </ModalCustom>
            )}
        </div>
    );
};
