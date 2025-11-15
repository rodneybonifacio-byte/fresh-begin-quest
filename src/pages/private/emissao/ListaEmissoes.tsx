import { Filter, Import, Plus, Printer, ReceiptText, BarChart3 } from 'lucide-react';
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
import { Content } from '../Content';
import { FiltroEmissao } from './FiltroEmissao';
import { ModalViewDeclaracaoConteudo } from './ModalViewDeclaracaoConteudo';
import { ModalViewErroPostagem } from './ModalViewErroPostagem';
import { ModalViewPDF } from './ModalViewPDF';
import { DashboardEmissoes } from './DashboardEmissoes';

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
    void setEtiqueta; // Mantido para compatibilidade com modais existentes
    const { onEmissaoVisualizarPDF } = useImprimirEtiquetaPDF();

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
        await onEmissaoVisualizarPDF(emissao, tipoEtiqueta, setIsLoading);
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
                                        header: 'Objeto',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.codigoObjeto}</span>
                                                <small className="text-slate-500 dark:text-slate-400">
                                                    {`${row.transportadora}${row.transportadora?.toLocaleUpperCase() === 'CORREIOS' ? ' ' + row.servico : ''}`}
                                                </small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Remetente',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.remetenteNome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">{row.cliente?.nome}</small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Destinatário',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.destinatario?.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">{formatCpfCnpj(row.destinatario?.cpfCnpj || '')}</small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Frete R$',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.valor}</span>
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
                                            return formatDateTime(row.criadoEm);
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
