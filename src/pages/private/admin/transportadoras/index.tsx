import { Plus } from 'lucide-react';
import { DataTable } from '../../../../components/DataTable';
import { LoadSpinner } from '../../../../components/loading';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useLayout } from '../../../../providers/LayoutContext';
import { TransportadoraService } from '../../../../services/TransportadoraService';
import type { ITransportadora } from '../../../../types/transportadora';
import { Content } from '../../Content';
import { StatusBadge } from '../../../../components/StatusBadge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';

const TransportadorasList = () => {
    const { layout } = useLayout();
    const { setIsLoading } = useLoadingSpinner();

    const service = new TransportadoraService();
    const queryClient = useQueryClient();
    
    const { data: transportadoras, isLoading, isError } = useFetchQuery<ITransportadora[]>(['transportadoras'], async () => (await service.getAll()).data);
    
    const toggleTransportadora = async (transportadora: ITransportadora) => {
        console.log(transportadora);

        try {
            await mutation.mutateAsync(transportadora);
        } catch (error) {
            console.error('Error toggling transportadora:', error);
        }
        queryClient.invalidateQueries({ queryKey: ['transportadoras'] });
    };

    const mutation = useMutation({
        mutationFn: async (input: ITransportadora) => {
            if (!input.id) {
                throw new Error('Emissão não encontrada.');
            }
            setIsLoading(true);
            const response = await service.update(`${input.id}/${input.status.toLocaleUpperCase() === "ATIVO" ? 'inativo' : 'ativo'}`, { });
            return { success: true, response };
        },
        onSuccess: () => {
            setIsLoading(false);
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        },
    });

    return (
        <Content
            titulo="Transportadoras"
            subTitulo="Lista de transportadoras cadastradas no sistema"
            isButton
            button={[{ label: 'Adicionar Transportadora', icon: <Plus size={22} className="text-white" />, link: `/${layout}/transportadoras/adicionar` }]}
            data={transportadoras && transportadoras.length > 0 ? transportadoras : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && transportadoras && transportadoras.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
                    <DataTable<ITransportadora>
                        data={transportadoras}
                        rowKey={(row) => row.id?.toString() || ''}
                        columns={[
                            { header: 'Nome', accessor: 'nome' },
                            { header: 'Status', accessor: (transportadora) => <StatusBadge status={transportadora.status || ''} tipo="ativo" /> },
                        ]}
                        actions={[
                            {
                                label: 'Ativa/Desativa',
                                onClick: (transportadora) => toggleTransportadora(transportadora),
                            },
                            {
                                label: 'Editar',
                                to: (transportadora) => `/${layout}/transportadoras/${transportadora.nome.toLocaleLowerCase()}/credenciais`,
                            },
                        ]}
                    />
                </div>
            )}
        </Content>
    );
};

export default TransportadorasList;
