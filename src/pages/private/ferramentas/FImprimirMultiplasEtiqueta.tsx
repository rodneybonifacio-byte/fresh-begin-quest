import { useEffect, useState } from 'react';
import { EmissaoService } from '../../../services/EmissaoService';
import { useFetchQuery } from '../../../hooks/useFetchQuery';
import type { IEmissao } from '../../../types/IEmissao';
import { Content } from '../Content';
import { format } from 'date-fns';
import { LoadSpinner } from '../../../components/loading';
import { TableCustom } from '../../../components/table';
import { formatCep } from '../../../utils/lib.formats';
import { NotFoundData } from '../../../components/NotFoundData';
import CustomCheckbox from '../../../components/CheckboxCustom';
import { toast } from 'sonner';
import { StatusBadgeEmissao } from '../../../components/StatusBadgeEmissao';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoadingSpinner } from '../../../providers/LoadingSpinnerContext';
import { ModalViewPDF } from '../emissao/ModalViewPDF';
import { ArrowLeft } from 'lucide-react';

const FImprimirMultiplasEtiqueta = () => {
    const { setIsLoading } = useLoadingSpinner();
    const clientQuery = useQueryClient();
    const service = new EmissaoService();

    const {
        data: emissoes,
        isLoading,
        isError,
    } = useFetchQuery<IEmissao[]>(['emissoes', 'imprimir-em-massa'], async () => (await service.getAll({ imprimir: 'sim' })).data);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalViewPDF, setIsModalViewPDF] = useState(false);
    const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string }>();

    const mutation = useMutation({
        mutationFn: async (ids: string[]) => {
            setIsLoading(true);
            return service.imprimirEmMassa(ids);
        },
        onSuccess: () => {
            setIsLoading(false);
            toast.success('Etiquetas geradas com sucesso!', { duration: 5000, position: 'top-center' });
        },
        onError: (_error) => {
            setIsLoading(false);
            toast.error('Erro ao imprimir etiquetas!', { duration: 5000, position: 'top-center' });
        },
    });

    const handleImprimirSelecionados = async () => {
        if (selectedIds.length === 0) {
            toast.error('Selecione pelo menos uma etiqueta para imprimir!');
            return;
        }
        try {
            const result = await mutation.mutateAsync(selectedIds);
            setEtiqueta(result);
            setIsModalViewPDF(true);
            clientQuery.invalidateQueries({ queryKey: ['emissoes', 'imprimir-em-massa'] });
        } catch (_error) {
            toast.error('Erro ao imprimir etiquetas!', { duration: 5000, position: 'top-center' });
        }
        setSelectedIds([]);
    };

    const [emissoesOriginais, setEmissoesOriginais] = useState<IEmissao[]>([]);

    useEffect(() => {
        if (emissoes) setEmissoesOriginais(emissoes);
    }, [emissoes]);

    // Lógica para seleção de múltiplos itens
    const handleCheckboxChange = (id: string, selected: boolean) => {
        setSelectedIds((prev) => (selected ? [...prev, id] : prev.filter((item) => item !== id)));
    };

    // Função para marcar/desmarcar todos os itens
    const handleSelectAll = () => {
        if (selectedIds.length === emissoesOriginais.length) {
            // Se todos estão selecionados, desmarcar todos
            setSelectedIds([]);
        } else {
            // Se nem todos estão selecionados, selecionar todos
            const allIds = emissoesOriginais.map((emissao) => emissao.id?.toString() || '');
            setSelectedIds(allIds);
        }
    };

    // Verificar se todos os itens estão selecionados
    const isAllSelected = selectedIds.length === emissoesOriginais.length && emissoesOriginais.length > 0;

    return (
        <Content
            titulo="Ferramentas - Imprimir Etiquetas"
            subTitulo="Imprimir etiquetas em massa"
            isButton
            isToBack
            button={[
                {
                    label: isAllSelected ? 'Desmarcar Todos' : 'Marcar Todos',
                    onClick: handleSelectAll,
                    isShow: false,
                },
                ...(selectedIds.length > 0
                    ? [
                          {
                              label: `Imprimir (${selectedIds.length})`,
                              onClick: handleImprimirSelecionados,
                              isShow: selectedIds.length > 0 ? false : true,
                              icon: <ArrowLeft className="w-4 h-4" />,
                          },
                      ]
                    : []),
            ]}
            data={emissoes}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && emissoes && emissoes.length > 0 && (
                <div className="rounded-lg flex flex-col gap-2 bg-white dark:bg-slate-800 p-4 border border-gray-200 dark:border-gray-700">
                    <div className="md:lg:xl:block">
                        <TableCustom thead={['', 'Objeto', 'Destinatario', 'CEP', 'Status', 'Criado em']}>
                            {emissoesOriginais &&
                                emissoesOriginais.map((emissao: IEmissao) => (
                                    <tr key={emissao.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer`}>
                                        <td className="px-4 py-3">
                                            <CustomCheckbox
                                                checked={selectedIds.includes(emissao.id?.toString() || '')}
                                                item={{ value: emissao.id?.toString() || '', label: '' }}
                                                onSelected={(item, selected) => handleCheckboxChange(item.value, selected)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 flex-col flex">
                                            <span className="font-medium text-gray-900 dark:text-gray-100"> {emissao.codigoObjeto || '-------------'}</span>
                                            <span className="font-medium text-xs text-slate-400 dark:text-slate-500">{emissao.servico}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{emissao.destinatario?.nome}</td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{formatCep(emissao.destinatario?.endereco?.cep || '')}</td>

                                        <StatusBadgeEmissao
                                            status={emissao.status}
                                            mensagensErrorPostagem={emissao.mensagensErrorPostagem}
                                            handleOnViewErroPostagem={() => console.log('emissao.mensagensErrorPostagem')}
                                        />

                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {format(new Date(emissao?.criadoEm || ''), 'dd/MM/yyyy') || emissao.criadoEm}
                                        </td>
                                    </tr>
                                ))}
                        </TableCustom>
                    </div>
                </div>
            )}

            <ModalViewPDF isOpen={isModalViewPDF} base64={etiqueta?.dados || ''} onCancel={() => setIsModalViewPDF(false)} />

            {isError && <NotFoundData />}
        </Content>
    );
};

export default FImprimirMultiplasEtiqueta;
