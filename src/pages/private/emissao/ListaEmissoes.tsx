import { Filter, Import, Plus, Printer, ReceiptText, BarChart3, Download, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { LoadSpinner } from '../../../components/loading';
import { ModalCustom } from '../../../components/modal';
import { PaginacaoCustom } from '../../../components/PaginacaoCustom';
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
import { formatCpfCnpj } from '../../../utils/lib.formats';
import { exportEmissoesToExcel } from '../../../utils/exportToExcel';
import { Content } from '../Content';
import { FiltroEmissao } from './FiltroEmissao';
import { ModalViewDeclaracaoConteudo } from './ModalViewDeclaracaoConteudo';
import { ModalViewErroPostagem } from './ModalViewErroPostagem';
import { ModalViewPDF } from './ModalViewPDF';
import { DashboardEmissoes } from './DashboardEmissoes';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';

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
            status: tab,
        };

        const dataIni = searchParams.get('dataIni') || undefined;
        const dataFim = searchParams.get('dataFim') || undefined;
        const destinatario = searchParams.get('destinatario') || undefined;
        const status = searchParams.get('status') || undefined;
        const codigoObjeto = searchParams.get('codigoObjeto') || undefined;

        if (dataIni) params.dataIni = dataIni;
        if (dataFim) params.dataFim = dataFim;
        if (destinatario) params.destinatario = destinatario;
        if (status) params.status = status;
        if (codigoObjeto) params.codigoObjeto = codigoObjeto;
        return await service.getAll(params);
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
        if (!emissao.id) {
            toast.error('ID da emissão não encontrado');
            return;
        }

        if (!confirm('Tem certeza que deseja cancelar esta etiqueta? O valor será extornado automaticamente.')) {
            return;
        }

        setIsLoading(true);
        try {
            // Cancelar etiqueta via API
            await service.cancelarEmissao({ id: emissao.id });

            // Liberar crédito bloqueado
            const { error } = await supabase.rpc('liberar_credito_bloqueado', {
                p_emissao_id: emissao.id,
                p_codigo_objeto: emissao.codigoObjeto
            });

            if (error) {
                console.error('Erro ao liberar crédito:', error);
                toast.error('Etiqueta cancelada, mas houve erro ao extornar o crédito');
            } else {
                toast.success('Etiqueta cancelada e valor extornado com sucesso!');
            }

            // Recarregar dados
            window.location.reload();
        } catch (error: any) {
            console.error('Erro ao cancelar etiqueta:', error);
            toast.error(error?.message || 'Erro ao cancelar etiqueta');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Content
            titulo="Etiquetas de envio"
            subTitulo="Lista de etiquetas cadastradas no sistema"
            isButton
            button={[
                {
                    label: 'Adicionar',
                    link: '/app/emissao/adicionar',
                    icon: <Plus size={22} />,
                },
                {
                    label: 'Importar',
                    link: '/app/emissao/importacao',
                    icon: <Import size={22} />,
                    bgColor: 'bg-slate-600',
                },
                {
                    label: 'Exportar XLSX',
                    onClick: handleExportToExcel,
                    icon: <Download size={22} />,
                    bgColor: 'bg-green-600',
                },
                {
                    label: '',
                    onClick: () => setShowDashboard(!showDashboard),
                    icon: <BarChart3 size={22} className="text-purple-600" />,
                    bgColor: showDashboard ? 'bg-purple-100' : 'bg-slate-200',
                },
                {
                    label: '',
                    onClick: () => handlerToggleFilter(),
                    icon: <Filter size={22} className="text-slate-500" />,
                    bgColor: 'bg-slate-300',
                },
            ]}
            data={emissoes?.data && emissoes.data.length > 0 ? emissoes.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            
            {/* Dashboard Analítico */}
            {showDashboard && emissoes?.data && emissoes.data.length > 0 && (
                <DashboardEmissoes emissoes={emissoes.data} />
            )}

            <ResponsiveTabMenu tab={tab} setTab={setTab}>
                {!isLoading && !isError && emissoes && emissoes.data.length > 0 && (
                    <>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                            <DataTable<IEmissao>
                                data={data}
                                rowKey={(row) => row.id?.toString() || ''}
                                columns={[
                                    {
                                        header: 'Código Objeto',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-primary">{row.codigoObjeto}</span>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Transportadora',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.transportadora}</span>
                                                {row.transportadora?.toLocaleUpperCase() === 'CORREIOS' && (
                                                    <small className="text-slate-500 dark:text-slate-400">{row.servico}</small>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Remetente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.remetenteNome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.remetente?.endereco?.localidade || ''} - {row.remetente?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Cliente',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm">{row.cliente?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {formatCpfCnpj(row.cliente?.cpfCnpj || '')}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Destinatário',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{row.destinatario?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {row.destinatario?.endereco?.localidade || ''} - {row.destinatario?.endereco?.uf || ''}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Valores',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-green-600 dark:text-green-400">
                                                    R$ {row.valor}
                                                </span>
                                                {row.valorDeclarado > 0 && (
                                                    <small className="text-slate-500 dark:text-slate-400">
                                                        VD: R$ {row.valorDeclarado}
                                                    </small>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'NF',
                                        accessor: (row) => (
                                            <div className="flex flex-col gap-0.5">
                                                {row.numeroNotaFiscal && (
                                                    <span className="text-sm">{row.numeroNotaFiscal}</span>
                                                )}
                                                {row.valorNotaFiscal > 0 && (
                                                    <small className="text-slate-500 dark:text-slate-400">
                                                        R$ {row.valorNotaFiscal}
                                                    </small>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <StatusBadgeEmissao
                                                status={row.status}
                                                mensagensErrorPostagem={row.mensagensErrorPostagem}
                                                handleOnViewErroPostagem={handleOnViewErroPostagem}
                                            />
                                        ),
                                    },
                                    {
                                        header: 'Criado em',
                                        accessor: (row) => {
                                            return (
                                                <span className="text-sm whitespace-nowrap">
                                                    {formatDateTime(row.criadoEm)}
                                                </span>
                                            );
                                        },
                                    },
                                ]}
                                actionTitle={(row) => row.codigoObjeto || '---'}
                                actions={[
                                    {
                                        label: 'Detalhamento',
                                        icon: <ReceiptText size={16} className="text-purple-600" />,
                                        to: (row) => `./detail/${row.id}`,
                                        show: true,
                                    },
                                    {
                                        label: 'Imprimir Etiqueta',
                                        icon: <Printer size={16} className="text-blue-600" />,
                                        onClick: (row) => handleOnPDF(row, true),
                                        show: (row) => !row.mensagensErrorPostagem && !['ENTREGUE', 'EM_TRANSITO', 'POSTADO'].includes(row.status as string),
                                    },
                                    {
                                        label: 'Cancelar Etiqueta',
                                        icon: <XCircle size={16} className="text-red-600" />,
                                        onClick: (row) => handleCancelarEtiqueta(row),
                                        show: (row) => row.status === 'PRE_POSTADO',
                                    },
                                ]}
                            />
                        </div>
                        <div className="py-3">
                            <PaginacaoCustom meta={emissoes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </>
                )}
            </ResponsiveTabMenu>

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
        </Content>
    );
};
