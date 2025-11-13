import { useEffect, useState } from 'react';
import { EmissaoService } from '../../../../services/EmissaoService';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import type { IEmissao } from '../../../../types/IEmissao';
import { Content } from '../../Content';
import { LoadSpinner } from '../../../../components/loading';
import { TableCustom } from '../../../../components/table';
import { NotFoundData } from '../../../../components/NotFoundData';
import CustomCheckbox from '../../../../components/CheckboxCustom';
import { StatusBadgeEmissao } from '../../../../components/StatusBadgeEmissao';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { EnderecoDetalhado } from '../../../../components/EnderecoDetalhado';
import { toastError, toastSuccess } from '../../../../utils/toastNotify';
import { formatDateTime } from '../../../../utils/date-utils';
import { RefreshCcw } from 'lucide-react';
import { IntegracaoService } from '../../../../services/IntegracaoService';

const PedidosImportados = () => {
    const { setIsLoading } = useLoadingSpinner();
    const clientQuery = useQueryClient();
    const service = new EmissaoService();
    const serviceIntegracao = new IntegracaoService();

    const {
        data: emissoes,
        isLoading,
        isError,
    } = useFetchQuery<IEmissao[]>(['pedidos-importados', 'processar-pedidos'], async () => (await service.getAll({ pedidosImportado: 'sim' })).data);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const mutation = useMutation({
        mutationFn: async (ids: string[]) => {
            setIsLoading(true);
            return service.processarPedidosImportados(ids);
        },

        onSuccess: () => {
            setIsLoading(false);
            toastSuccess('Etiquetas geradas com sucesso!');
        },
        onError: (error) => {
            setIsLoading(false);
            toastError('Erro ao processar etiquetas!');
            console.log(error);
        },
    });

    const handleProcessarSelecionados = async () => {
        if (selectedIds.length === 0) {
            toastError('Selecione pelo menos uma etiqueta para processar!');
            return;
        }
        try {
            await mutation.mutateAsync(selectedIds);
            clientQuery.invalidateQueries({ queryKey: ['pedidos-importados', 'processar-pedidos'] });
        } catch (error) {
            console.log(error);
        }
        setSelectedIds([]);
    };

    const handleImportarPedido = async () => {
        if (selectedIds.length > 0) {
            toastError('Desmarque os pedidos antes de importar novos!');
            return;
        }
        try {
            setIsLoading(true);
            const response = await serviceIntegracao.importaPedidos(undefined, 'importa-pedidos-marketplace');
            toastSuccess('Pedidos importados com sucesso!');

            clientQuery.invalidateQueries({ queryKey: ['pedidos-importados', 'processar-pedidos'] });
            return response;
        } finally {
            setIsLoading(false);
            setSelectedIds([]);
        }
    };

    const [emissoesOriginais, setEmissoesOriginais] = useState<IEmissao[]>([]);

    useEffect(() => {
        if (emissoes) setEmissoesOriginais(emissoes);
    }, [emissoes]);

    // Lógica para seleção de múltiplos itens
    const handleCheckboxChange = (id: string, selected: boolean) => {
        setSelectedIds((prev) => (selected ? [...prev, id] : prev.filter((item) => item !== id)));
    };

    return (
        <Content
            titulo="Envios - Pedidos Importados"
            subTitulo="Processar pedidos importados"
            isButton
            button={[
                // Exibe o botão "Processar" somente se houver itens selecionados
                ...(selectedIds.length > 0
                    ? [
                          {
                              label: `Processar (${selectedIds.length})`,
                              onClick: handleProcessarSelecionados,
                              isShow: selectedIds.length > 0 ? false : true,
                          },
                      ]
                    : []),
                {
                    label: 'Importar Pedidos',
                    onClick: handleImportarPedido,
                    bgColor: 'bg-primary',
                    icon: <RefreshCcw className="w-4 h-4" />,
                },
            ]}
            data={emissoes}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && emissoes && emissoes.length > 0 && (
                <div className="rounded-lg flex flex-col gap-2">
                    <div className="md:lg:xl:block">
                        <TableCustom thead={['', 'PEDIDO', 'PLATAFORMA', 'Destinatario', 'SERVIÇO', 'Status', 'Criado em']}>
                            {emissoesOriginais &&
                                emissoesOriginais.map((emissao: IEmissao) => (
                                    <tr key={emissao.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                        <td className="px-4 py-3">
                                            <CustomCheckbox
                                                checked={selectedIds.includes(emissao.id?.toString() || '')}
                                                item={{ value: emissao.id?.toString() || '', label: '' }}
                                                onSelected={(item, selected) => handleCheckboxChange(item.value, selected)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">{emissao.externoId}</td>
                                        <td className="px-4 py-3">{emissao.origem}</td>
                                        <td className="px-4 py-3 flex-col flex">
                                            <span className="font-medium"> {emissao.destinatario?.nome}</span>
                                            <span className="font-medium text-xs text-slate-400">
                                                <EnderecoDetalhado endereco={emissao.destinatario?.endereco} />
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{emissao.servico || '---'}</td>
                                        <StatusBadgeEmissao
                                            status={emissao.status}
                                            mensagensErrorPostagem={emissao.mensagensErrorPostagem}
                                            handleOnViewErroPostagem={() => console.log('emissao.mensagensErrorPostagem')}
                                        />
                                        <td className="px-4 py-3">{formatDateTime(emissao?.criadoEm || '') || emissao.criadoEm}</td>
                                    </tr>
                                ))}
                        </TableCustom>
                    </div>
                </div>
            )}

            {isError && <NotFoundData />}
        </Content>
    );
};

export default PedidosImportados;
