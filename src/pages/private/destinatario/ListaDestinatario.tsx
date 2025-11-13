import clsx from 'clsx';
import { Filter, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { InputLabel } from '../../../components/input-label';
import { LoadSpinner } from '../../../components/loading';
import { PaginacaoCustom } from '../../../components/PaginacaoCustom';
import { useFetchQuery } from '../../../hooks/useFetchQuery';
import { useGlobalConfig } from '../../../providers/GlobalConfigContext';
import { DestinatarioService } from '../../../services/DestinatarioService';
import { IDestinatario } from '../../../types/IDestinatario';
import type { IResponse } from '../../../types/IResponse';
import { formatCpfCnpj } from '../../../utils/lib.formats';
import { Content } from '../Content';
import { ModalCadastrarDestinatario } from './ModalCadastrarDestinatario';

export const ListaDestinatario = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [destinatarioSelecionado, setDestinatarioSelecionado] = useState<IDestinatario | undefined>();
    const [isModalOpenDestinatario, setIsModalOpenDestinatario] = useState<boolean>(false);
    const [data, setData] = useState<IDestinatario[]>([]);
    const [page, setPage] = useState<number>(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const service = new DestinatarioService();
    const config = useGlobalConfig();
    const perPage = config.pagination.perPage;

    const {
        data: destinatarios,
        isLoading,
        isError,
    } = useFetchQuery<IResponse<IDestinatario[]>>(['destinatarios', page, searchParams.toString()], async () => {
        const params: { limit: number; offset: number; nomeDestinatario?: string; cpfCnpj?: string } = {
            limit: perPage,
            offset: (page - 1) * perPage,
        };

        const nomeDestinatario = searchParams.get('nomeDestinatario');
        if (nomeDestinatario && nomeDestinatario.trim() !== '') {
            params.nomeDestinatario = nomeDestinatario;
        }

        const cpfCnpj = searchParams.get('cpfCnpj');
        if (cpfCnpj && cpfCnpj.trim() !== '') {
            params.cpfCnpj = cpfCnpj;
        }

        return await service.getAll(params);
    });

    // Atualiza a página e os dados conforme o número da página
    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };

    useEffect(() => {
        if (destinatarios?.data) {
            setData(destinatarios.data);
        }
    }, [destinatarios]);

    const handlerToggleFilter = () => {
        setIsFilterOpen((prev) => !prev);
    };

    const [form, setForm] = useState({
        nomeDestinatario: searchParams.get('nomeDestinatario') || '',
        cpfCnpj: searchParams.get('cpfCnpj') || '',
    });

    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const handleFiltrar = () => {
        // Filtra os dados já carregados
        let filteredData = data;
        if (form.nomeDestinatario) {
            filteredData = filteredData.filter((item) => item.nome.toLowerCase().includes(form.nomeDestinatario.toLowerCase()));
        }
        if (form.cpfCnpj) {
            filteredData = filteredData.filter((item) => item.cpfCnpj.toLowerCase().includes(form.cpfCnpj.toLowerCase()));
        }

        // Se houver resultados, atualiza o state local; caso contrário, dispara a API
        if (filteredData.length > 0) {
            setData(filteredData);
        } else {
            const params = new URLSearchParams();
            Object.entries(form).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
            setSearchParams(params);
            setPage(1);
        }
    };

    return (
        <Content
            titulo="Destinatários"
            subTitulo="Lista de destinatários cadastradas no sistema"
            isButton
            button={[
                {
                    label: 'Adicionar',
                    icon: <Plus size={22} className="text-white" />,
                    onClick: () => setIsModalOpenDestinatario(true),
                },
                {
                    label: '',
                    onClick: () => handlerToggleFilter(),
                    icon: <Filter size={22} className="text-slate-500" />,
                    bgColor: 'bg-slate-300',
                },
            ]}
            data={destinatarios?.data && destinatarios.data.length > 0 ? destinatarios.data : []}
        >
            <div
                className={clsx('transition-all duration-300', isFilterOpen ? 'max-h-[1000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2')}
            >
                <div className="bg-white w-full p-6 flex flex-col rounded-xl gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">Filtro</h1>
                        <p className="text-xs text-slate-500">Filtre as etiquetas de acordo com os parâmetros abaixo.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <div>
                            <InputLabel
                                labelTitulo="Nome destinatário:"
                                type="text"
                                value={form.nomeDestinatario}
                                onChange={(e) => handleChange('nomeDestinatario', e.target.value)}
                            />
                        </div>
                        <div>
                            <InputLabel labelTitulo="CPF/CNPJ:" type="text" value={form.cpfCnpj} onChange={(e) => handleChange('cpfCnpj', e.target.value)} />
                        </div>
                    </div>

                    <div className="flex justify-start">
                        <button
                            onClick={() => {
                                handleFiltrar();
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-btnhover transition duration-300"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && destinatarios && destinatarios.data.length > 0 && (
                <div className="rounded-lg">
                    <div className="bg-white dark:bg-slate-800 rounded p-6 shadow-sm overflow-visible">
                        <DataTable<IDestinatario>
                            data={destinatarios.data}
                            hover
                            striped
                            columns={[
                                {
                                    header: 'Nome',
                                    accessor: (destinatario) => (
                                        <div className="flex-col flex gap-1">
                                            <span className="font-medium">{destinatario.nome}</span>
                                            <span className="font-medium text-xs text-slate-400">
                                                {destinatario.endereco ? (
                                                    <>
                                                        {destinatario.endereco.logradouro}, {destinatario.endereco.numero} {destinatario.endereco.complemento},{' '}
                                                        {destinatario.endereco.bairro} - {destinatario.endereco.localidade} - {destinatario.endereco.uf}
                                                    </>
                                                ) : (
                                                    <small className="text-slate-400">Nenhum endereço cadastrado</small>
                                                )}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Documento',
                                    accessor: (destinatario) => formatCpfCnpj(destinatario?.cpfCnpj || ''),
                                },
                            ]}
                            actionTitle={(destinatario) => destinatario.nome}
                            actions={[
                                {
                                    label: 'Editar',
                                    onClick: (destinatario) => {
                                        setDestinatarioSelecionado(destinatario);
                                        setIsModalOpenDestinatario(true);
                                    },
                                },
                            ]}
                        />
                    </div>
                    <div className="py-3">
                        <PaginacaoCustom meta={destinatarios?.meta} onPageChange={handlePageChange} />
                    </div>
                </div>
            )}

            <ModalCadastrarDestinatario
                isOpen={isModalOpenDestinatario}
                onCancel={() => {
                    setIsModalOpenDestinatario(false);
                    setDestinatarioSelecionado(undefined);
                }}
                destinatario={destinatarioSelecionado}
            />
        </Content>
    );
};
