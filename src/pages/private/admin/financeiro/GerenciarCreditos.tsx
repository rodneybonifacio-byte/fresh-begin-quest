import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Wallet, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../integrations/supabase/client';
import { ClienteService } from '../../../../services/ClienteService';
import { ButtonComponent } from '../../../../components/button';
import { InputLabel } from '../../../../components/input-label';
import { ModalCustom } from '../../../../components/modal';
import type { IClienteToFilter } from '../../../../types/viewModel/IClienteToFilter';

export default function GerenciarCreditos() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<IClienteToFilter | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [operacao, setOperacao] = useState<'adicionar' | 'remover'>('adicionar');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const queryClient = useQueryClient();
    const clienteService = new ClienteService();

    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes-credito'],
        queryFn: async () => {
            const response = await clienteService.obterAtivos();
            return response;
        },
    });

    const clientesFiltrados = clientes?.filter(cliente => 
        cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.cpfCnpj?.includes(searchTerm)
    ) || [];

    const creditoMutation = useMutation({
        mutationFn: async ({ clienteId, valor, operacao, descricao }: { 
            clienteId: string; 
            valor: number; 
            operacao: 'adicionar' | 'remover';
            descricao: string;
        }) => {
            if (operacao === 'adicionar') {
                const { data, error } = await supabase.functions.invoke('adicionar-saldo-manual', {
                    body: { clienteId, valor }
                });
                
                if (error) throw error;
                
                await supabase.from('transacoes_credito').insert({
                    cliente_id: clienteId,
                    tipo: 'recarga',
                    valor: valor,
                    descricao: descricao || 'Crédito adicionado pelo administrador',
                    status: 'consumido',
                });
                
                return data;
            } else {
                const { error } = await supabase.from('transacoes_credito').insert({
                    cliente_id: clienteId,
                    tipo: 'consumo',
                    valor: -Math.abs(valor),
                    descricao: descricao || 'Crédito removido pelo administrador',
                    status: 'consumido',
                });
                
                if (error) throw error;
                return { success: true };
            }
        },
        onSuccess: () => {
            toast.success(operacao === 'adicionar' ? 'Crédito adicionado com sucesso!' : 'Crédito removido com sucesso!');
            setModalOpen(false);
            setValor('');
            setDescricao('');
            setSelectedCliente(null);
            queryClient.invalidateQueries({ queryKey: ['clientes-credito'] });
        },
        onError: (error: Error) => {
            toast.error(`Erro: ${error.message || 'Falha na operação'}`);
        },
    });

    const handleOpenModal = (cliente: IClienteToFilter, tipo: 'adicionar' | 'remover') => {
        setSelectedCliente(cliente);
        setOperacao(tipo);
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (!selectedCliente || !valor) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        const valorNumerico = parseFloat(valor.replace(',', '.'));
        if (isNaN(valorNumerico) || valorNumerico <= 0) {
            toast.error('Valor inválido');
            return;
        }

        creditoMutation.mutate({
            clienteId: selectedCliente.id,
            valor: valorNumerico,
            operacao,
            descricao,
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gerenciar Créditos</h1>
                    <p className="text-muted-foreground">Adicione ou remova créditos dos clientes</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CPF/CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">CPF/CNPJ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : clientesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                        Nenhum cliente encontrado
                                    </td>
                                </tr>
                            ) : (
                                clientesFiltrados.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-medium text-foreground">{cliente.nome}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{cliente.cpfCnpj}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
                                                    onClick={() => handleOpenModal(cliente, 'adicionar')}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Adicionar
                                                </button>
                                                <button
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                    onClick={() => handleOpenModal(cliente, 'remover')}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                    Remover
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <ModalCustom 
                    title={operacao === 'adicionar' ? 'Adicionar Crédito' : 'Remover Crédito'} 
                    description={`${operacao === 'adicionar' ? 'Adicionar' : 'Remover'} crédito para: ${selectedCliente?.nome}`}
                    onCancel={() => setModalOpen(false)}
                    size="small"
                >
                    <div className="space-y-4">
                        <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2">
                            <Wallet className={operacao === 'adicionar' ? 'text-green-600' : 'text-red-600'} />
                            <div>
                                <p className="text-sm text-muted-foreground">Cliente:</p>
                                <p className="font-medium">{selectedCliente?.nome}</p>
                            </div>
                        </div>

                        <InputLabel
                            labelTitulo="Valor (R$) *"
                            value={valor}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValor(e.target.value)}
                            placeholder="0,00"
                        />

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
                            <textarea
                                placeholder="Motivo da operação..."
                                value={descricao}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescricao(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex gap-2 pt-4 justify-end">
                            <ButtonComponent 
                                onClick={() => setModalOpen(false)}
                                variant="ghost"
                                border="outline"
                            >
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSubmit}
                                disabled={creditoMutation.isPending}
                                className={operacao === 'adicionar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                {creditoMutation.isPending ? 'Processando...' : operacao === 'adicionar' ? 'Adicionar' : 'Remover'}
                            </ButtonComponent>
                        </div>
                    </div>
                </ModalCustom>
            )}
        </div>
    );
}
