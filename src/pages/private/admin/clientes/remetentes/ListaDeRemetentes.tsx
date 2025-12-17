import { Plus, ReceiptText, Settings, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from '../../../../../components/DataTable';
import { LoadSpinner } from '../../../../../components/loading';
import { PaginacaoCustom } from '../../../../../components/PaginacaoCustom';
import { StatusBadge } from '../../../../../components/StatusBadge';
import { useRemetentes } from '../../../../../hooks/useRemetente';
import { useGlobalConfig } from '../../../../../providers/GlobalConfigContext';
import { useLayout } from '../../../../../providers/LayoutContext';
import { RemetenteService } from '../../../../../services/RemetenteService';
import type { IRemetente } from '../../../../../types/IRemetente';
import { formatDate } from '../../../../../utils/date-utils';
import { formatCpfCnpj } from '../../../../../utils/lib.formats';
import { Content } from '../../../Content';
import { ModalEditarRemetente } from '../../../remetente/ModalEditarRemetente';

const ListaDeRemetentes = () => {
    const { layout } = useLayout();
    const config = useGlobalConfig();
    const service = new RemetenteService();
    const perPage = config.pagination.perPage;
    const [data, setData] = useState<IRemetente[]>([]);
    const [page, setPage] = useState<number>(1);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRemetente, setSelectedRemetente] = useState<IRemetente | null>(null);
    // pegar o parametro do clienteId da URL
    const { clienteId } = useParams<{ clienteId: string }>();

    const { data: remetentes, isLoading, isError } = useRemetentes({ clienteId, page, perPage, service });

    // Atualiza a página e os dados conforme o número da página
    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    useEffect(() => {
        if (remetentes?.data) {
            setData(remetentes.data);
        }
    }, [remetentes]);

    return (
        <Content
            titulo="Remetentes"
            subTitulo="Lista de remetentes cadastrados para remetentes no sistema"
            button={[
                {
                    label: 'Adicionar',
                    icon: <Plus size={22} className="text-white" />,
                    link: `/${layout}/remetentes/adicionar`,
                },
            ]}
            isToBack
            data={remetentes?.data && remetentes.data.length > 0 ? remetentes.data : []}
        >
            <>
                {isLoading && <LoadSpinner mensagem="Carregando..." />}

                {!isLoading && !isError && remetentes?.data && remetentes.data.length > 0 && (
                    <div className=" rounded-lg">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                            <DataTable<IRemetente>
                                data={data}
                                rowKey={(row) => row.id.toString() || ''}
                                columns={[
                                    {
                                        header: 'Razão Social',
                                        accessor: (row) => (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.nome}</span>
                                                <small className="text-slate-500 dark:text-slate-400">{formatCpfCnpj(row.cpfCnpj)}</small>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Status',
                                        accessor: () => <StatusBadge status={'ativo'} tipo="ativo" />,
                                    },
                                    {
                                        header: 'Criado Em',
                                        accessor: (row) => formatDate(row.criadoEm?.toString() || ''),
                                    },
                                ]}
                                actionTitle={(row) => row.nome}
                                actions={[
                                    {
                                        label: 'Editar',
                                        icon: <Pencil size={16} />,
                                        onClick: (row) => {
                                            setSelectedRemetente(row);
                                            setIsEditModalOpen(true);
                                        },
                                        show: true,
                                    },
                                    {
                                        label: 'Detalhamento',
                                        icon: <ReceiptText size={16} />,
                                        to: (_row) => `#`,
                                        show: true,
                                    },
                                    {
                                        label: 'Configurar',
                                        icon: <Settings size={16} />,
                                        to: (remetente) => `/${layout}/clientes/${clienteId}/remetentes/${remetente.id}/configuracoes`,
                                        show: true,
                                    },
                                ]}
                            />
                        </div>
                        <div className="py-3">
                            <PaginacaoCustom meta={remetentes?.meta} onPageChange={handlePageChange} />
                        </div>
                    </div>
                )}

                <ModalEditarRemetente
                    isOpen={isEditModalOpen}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedRemetente(null);
                    }}
                    remetente={selectedRemetente}
                />
            </>
        </Content>
    );
};
export default ListaDeRemetentes;
