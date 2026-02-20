import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../../integrations/supabase/client";
import { Content } from "../../Content";
import { LoadSpinner } from "../../../../components/loading";
import { TableCustom } from "../../../../components/table";
import { TableDropdown } from "../../../../components/table/dropdown";
import { format } from "date-fns";
import { toast } from "sonner";

interface Parceiro {
    id: string;
    nome: string;
    email: string;
    cpf_cnpj: string;
    telefone: string;
    status: 'pendente' | 'aprovado' | 'suspenso' | 'cancelado';
    codigo_parceiro: string;
    link_indicacao: string;
    chave_pix: string | null;
    total_clientes_ativos: number;
    total_comissao_acumulada: number;
    created_at: string;
}

const statusColors: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-green-100 text-green-800',
    suspenso: 'bg-orange-100 text-orange-800',
    cancelado: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
};

export const ParceirosConecta = () => {
    const queryClient = useQueryClient();
    const [busca, setBusca] = useState("");

    const { data: parceiros, isLoading } = useQuery({
        queryKey: ['admin-parceiros'],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('admin-parceiros', {
                method: 'GET',
            });
            if (error) throw error;
            return (data?.data ?? []) as Parceiro[];
        },
    });

    const logarComoParceiro = async (parceiro: Parceiro) => {
        try {
            const { data, error } = await supabase.functions.invoke('admin-parceiros', {
                method: 'POST',
                body: { parceiroId: parceiro.id },
            });
            if (error) throw error;
            // Salva no localStorage como se fosse um login normal
            localStorage.setItem('parceiro_token', data.token);
            localStorage.setItem('parceiro_data', JSON.stringify(data.parceiro));
            // Abre o dashboard do Conecta+ em nova aba
            window.open(`${window.location.origin}/conecta/dashboard`, '_blank');
            toast.success(`Abrindo dashboard de ${parceiro.nome}`);
        } catch {
            toast.error('Erro ao gerar acesso como parceiro');
        }
    };


    const atualizarStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase.functions.invoke('admin-parceiros', {
                method: 'PATCH',
                body: { id, status },
            });
            if (error) throw error;
            toast.success(`Status atualizado para ${statusLabels[status]}`);
            queryClient.invalidateQueries({ queryKey: ['admin-parceiros'] });
        } catch {
            toast.error('Erro ao atualizar status');
        }
    };

    const deletarParceiro = async (parceiro: Parceiro) => {
        const confirmado = window.confirm(`Tem certeza que deseja EXCLUIR o parceiro "${parceiro.nome}"? Esta ação não pode ser desfeita.`);
        if (!confirmado) return;
        try {
            const { error } = await supabase.functions.invoke('admin-parceiros', {
                method: 'DELETE',
                body: { id: parceiro.id },
            });
            if (error) throw error;
            toast.success('Parceiro excluído com sucesso');
            queryClient.invalidateQueries({ queryKey: ['admin-parceiros'] });
        } catch {
            toast.error('Erro ao excluir parceiro');
        }
    };

    const filtrados = (parceiros ?? []).filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.email.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo_parceiro.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <Content
            titulo="Parceiros Conecta+"
            subTitulo="Gerencie os parceiros do programa Conecta+"
            data={parceiros}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando parceiros..." /> : null}

            {!isLoading && (
                <div className="space-y-4">
                    {/* Busca e stats */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail ou código..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">{filtrados.length} parceiros</span>
                        <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                            {filtrados.filter(p => p.status === 'aprovado').length} aprovados
                        </span>
                        <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                            {filtrados.filter(p => p.status === 'pendente').length} pendentes
                        </span>
                    </div>

                    {filtrados.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Nenhum parceiro encontrado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <TableCustom thead={['Parceiro', 'Contato', 'Código', 'Status', 'Clientes', 'Comissão Total', 'Cadastro', 'Ações']}>
                                {filtrados.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{p.nome}</div>
                                            <div className="text-xs text-gray-500">{p.cpf_cnpj}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">{p.email}</div>
                                            <div className="text-xs text-gray-500">{p.telefone}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{p.codigo_parceiro}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                                                {statusLabels[p.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium">{p.total_clientes_ativos ?? 0}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-green-700">
                                                R$ {Number(p.total_comissao_acumulada ?? 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {format(new Date(p.created_at), 'dd/MM/yyyy')}
                                        </td>
                                         <td className="px-4 py-3 text-right">
                                             <TableDropdown
                                                 dropdownKey={p.id}
                                                 items={[
                                                     {
                                                         id: 'logar',
                                                         label: '🔑 Logar como parceiro',
                                                         type: 'button' as const,
                                                         onClick: () => logarComoParceiro(p),
                                                     },
                                                     ...(p.status !== 'aprovado' ? [{
                                                         id: 'aprovar',
                                                         label: '✅ Aprovar',
                                                         type: 'button' as const,
                                                         onClick: () => atualizarStatus(p.id, 'aprovado'),
                                                     }] : []),
                                                     ...(p.status !== 'suspenso' ? [{
                                                         id: 'suspender',
                                                         label: '⏸️ Suspender',
                                                         type: 'button' as const,
                                                         onClick: () => atualizarStatus(p.id, 'suspenso'),
                                                     }] : []),
                                                     ...(p.status !== 'cancelado' ? [{
                                                         id: 'cancelar',
                                                         label: '🚫 Cancelar',
                                                         type: 'button' as const,
                                                         onClick: () => atualizarStatus(p.id, 'cancelado'),
                                                     }] : []),
                                                     {
                                                         id: 'excluir',
                                                         label: '🗑️ Excluir',
                                                         type: 'button' as const,
                                                         onClick: () => deletarParceiro(p),
                                                     },
                                                 ]}
                                             />
                                        </td>
                                    </tr>
                                ))}
                            </TableCustom>
                        </div>
                    )}
                </div>
            )}
        </Content>
    );
};

export default ParceirosConecta;
