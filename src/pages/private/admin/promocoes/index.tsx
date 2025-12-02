import { useState, useEffect } from 'react';
import { Gift, Users, DollarSign, ToggleLeft, ToggleRight, Save, Loader2, Phone, User, Wallet, RefreshCw } from 'lucide-react';
import { supabase } from '../../../../integrations/supabase/client';
import { toast } from 'sonner';
import { Content } from '../../Content';

interface Promocao {
    id: string;
    tipo: string;
    contador: number;
    limite: number;
    valor_premio: number;
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

interface ParticipantePromo {
    clienteId: string;
    nome: string;
    telefone: string;
    saldoDisponivel: number;
    dataCredito: string;
}

const PromocoesAdmin = () => {
    const [promocoes, setPromocoes] = useState<Promocao[]>([]);
    const [participantes, setParticipantes] = useState<ParticipantePromo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingParticipantes, setLoadingParticipantes] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [editedValues, setEditedValues] = useState<Record<string, Partial<Promocao>>>({});

    useEffect(() => {
        fetchPromocoes();
        fetchParticipantes();
    }, []);

    const fetchPromocoes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contador_cadastros')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromocoes(data || []);
        } catch (error) {
            console.error('Erro ao buscar promoções:', error);
            toast.error('Erro ao carregar promoções');
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipantes = async () => {
        try {
            setLoadingParticipantes(true);
            
            // Buscar transações de bônus (100 primeiros E bônus de recarga)
            const { data: bonusTransacoes, error: bonusError } = await supabase
                .from('transacoes_credito')
                .select('*')
                .eq('tipo', 'recarga')
                .or('descricao.like.%100 primeiros%,descricao.like.%Bônus Recarga%,descricao.like.%Bônus%')
                .order('created_at', { ascending: true });

            if (bonusError) {
                console.error('Erro ao buscar transações de bônus:', bonusError);
            }

            // Também buscar da cadastros_origem como fallback
            const { data: cadastrosOrigem, error: origemError } = await supabase
                .from('cadastros_origem')
                .select('*')
                .eq('origem', 'autocadastro')
                .order('created_at', { ascending: false });

            if (origemError) {
                console.error('Erro ao buscar cadastros:', origemError);
            }

            const participantesData: ParticipantePromo[] = [];
            const clienteIdsProcessados = new Set<string>();

            // Processar transações de bônus primeiro
            if (bonusTransacoes && bonusTransacoes.length > 0) {
                for (const transacao of bonusTransacoes) {
                    if (clienteIdsProcessados.has(transacao.cliente_id)) continue;
                    clienteIdsProcessados.add(transacao.cliente_id);

                    // Buscar dados do remetente para obter nome e telefone
                    const { data: remetenteData } = await supabase
                        .from('remetentes')
                        .select('*')
                        .eq('cliente_id', transacao.cliente_id)
                        .limit(1)
                        .maybeSingle();

                    // Buscar saldo disponível
                    const { data: saldoData } = await supabase
                        .rpc('calcular_saldo_disponivel', { p_cliente_id: transacao.cliente_id });

                    // Extrair posição da descrição
                    const posicaoMatch = transacao.descricao?.match(/#(\d+)/);
                    const posicao = posicaoMatch ? posicaoMatch[1] : '-';

                    participantesData.push({
                        clienteId: transacao.cliente_id,
                        nome: remetenteData?.nome || `Cliente #${posicao}`,
                        telefone: remetenteData?.telefone || remetenteData?.celular || '-',
                        saldoDisponivel: saldoData || 0,
                        dataCredito: transacao.created_at || ''
                    });
                }
            }

            // Adicionar cadastros_origem que não estão nas transações de bônus
            if (cadastrosOrigem && cadastrosOrigem.length > 0) {
                for (const cadastro of cadastrosOrigem) {
                    if (clienteIdsProcessados.has(cadastro.cliente_id)) continue;
                    clienteIdsProcessados.add(cadastro.cliente_id);

                    const { data: saldoData } = await supabase
                        .rpc('calcular_saldo_disponivel', { p_cliente_id: cadastro.cliente_id });

                    participantesData.push({
                        clienteId: cadastro.cliente_id,
                        nome: cadastro.nome_cliente || 'Não informado',
                        telefone: cadastro.telefone_cliente || '-',
                        saldoDisponivel: saldoData || 0,
                        dataCredito: cadastro.created_at || ''
                    });
                }
            }

            setParticipantes(participantesData);
        } catch (error) {
            console.error('Erro ao buscar participantes:', error);
            toast.error('Erro ao carregar participantes');
        } finally {
            setLoadingParticipantes(false);
        }
    };

    const handleFieldChange = (id: string, field: keyof Promocao, value: any) => {
        setEditedValues(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (promocao: Promocao) => {
        const changes = editedValues[promocao.id];
        if (!changes || Object.keys(changes).length === 0) {
            toast.info('Nenhuma alteração para salvar');
            return;
        }

        try {
            setSaving(promocao.id);
            const { error } = await supabase
                .from('contador_cadastros')
                .update({
                    ...changes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', promocao.id);

            if (error) throw error;

            toast.success('Promoção atualizada com sucesso!');
            setEditedValues(prev => {
                const newValues = { ...prev };
                delete newValues[promocao.id];
                return newValues;
            });
            fetchPromocoes();
        } catch (error) {
            console.error('Erro ao salvar promoção:', error);
            toast.error('Erro ao salvar promoção');
        } finally {
            setSaving(null);
        }
    };

    const toggleAtivo = async (promocao: Promocao) => {
        try {
            setSaving(promocao.id);
            const { error } = await supabase
                .from('contador_cadastros')
                .update({
                    ativo: !promocao.ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', promocao.id);

            if (error) throw error;

            toast.success(`Promoção ${!promocao.ativo ? 'ativada' : 'desativada'} com sucesso!`);
            fetchPromocoes();
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            toast.error('Erro ao alterar status da promoção');
        } finally {
            setSaving(null);
        }
    };

    const getValue = (promocao: Promocao, field: keyof Promocao): string | number => {
        const value = editedValues[promocao.id]?.[field] ?? promocao[field];
        if (typeof value === 'boolean') return value ? 1 : 0;
        return value as string | number;
    };

    const hasChanges = (id: string) => {
        return editedValues[id] && Object.keys(editedValues[id]).length > 0;
    };

    const formatTipoPromo = (tipo: string) => {
        const tipos: Record<string, string> = {
            'primeiros_cadastros': 'Primeiros Cadastros',
            'bonus_recarga': 'Bônus de Recarga'
        };
        return tipos[tipo] || tipo;
    };

    const progressPercentage = (contador: number, limite: number) => {
        return Math.min((contador / limite) * 100, 100);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Content titulo="Promoções" subTitulo="Gerenciamento de promoções e incentivos">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Content>
        );
    }

    return (
        <Content titulo="Promoções" subTitulo="Gerenciamento de promoções e incentivos">
            <div className="space-y-6">
                {/* Cards de resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Gift className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Promoções Ativas</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {promocoes.filter(p => p.ativo).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Users className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Participantes</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {promocoes.reduce((acc, p) => acc + p.contador, 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <DollarSign className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Créditos Distribuídos</p>
                                <p className="text-2xl font-bold text-foreground">
                                    R$ {promocoes.reduce((acc, p) => acc + (p.contador * p.valor_premio), 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lista de promoções */}
                <div className="space-y-4">
                    {promocoes.map((promocao) => (
                        <div 
                            key={promocao.id} 
                            className={`bg-card border rounded-xl p-6 transition-all ${
                                promocao.ativo ? 'border-primary/30' : 'border-border opacity-75'
                            }`}
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                {/* Info da promoção */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${promocao.ativo ? 'bg-primary/10' : 'bg-muted'}`}>
                                            <Gift className={`w-5 h-5 ${promocao.ativo ? 'text-primary' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">
                                                {formatTipoPromo(promocao.tipo)}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {promocao.ativo ? 'Ativa' : 'Inativa'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Barra de progresso */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Progresso</span>
                                            <span className="font-medium text-foreground">
                                                {getValue(promocao, 'contador')} / {getValue(promocao, 'limite')}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${progressPercentage(Number(getValue(promocao, 'contador')), Number(getValue(promocao, 'limite')))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Campos editáveis */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-auto">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Contador</label>
                                        <input
                                            type="number"
                                            value={getValue(promocao, 'contador')}
                                            onChange={(e) => handleFieldChange(promocao.id, 'contador', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Limite</label>
                                        <input
                                            type="number"
                                            value={getValue(promocao, 'limite')}
                                            onChange={(e) => handleFieldChange(promocao.id, 'limite', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Valor Prêmio (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={getValue(promocao, 'valor_premio')}
                                            onChange={(e) => handleFieldChange(promocao.id, 'valor_premio', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 lg:flex-col">
                                    <button
                                        onClick={() => toggleAtivo(promocao)}
                                        disabled={saving === promocao.id}
                                        className={`p-2 rounded-lg transition-colors ${
                                            promocao.ativo 
                                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                        title={promocao.ativo ? 'Desativar' : 'Ativar'}
                                    >
                                        {promocao.ativo ? (
                                            <ToggleRight className="w-5 h-5" />
                                        ) : (
                                            <ToggleLeft className="w-5 h-5" />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleSave(promocao)}
                                        disabled={saving === promocao.id || !hasChanges(promocao.id)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            hasChanges(promocao.id)
                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                                        }`}
                                        title="Salvar alterações"
                                    >
                                        {saving === promocao.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Info adicional */}
                            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>Criado em: {new Date(promocao.created_at).toLocaleDateString('pt-BR')}</span>
                                <span>Atualizado em: {new Date(promocao.updated_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    ))}

                    {promocoes.length === 0 && (
                        <div className="text-center py-12 bg-card border border-border rounded-xl">
                            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma promoção cadastrada</p>
                        </div>
                    )}
                </div>

                {/* Lista de Participantes */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Participantes da Promoção</h3>
                                <p className="text-sm text-muted-foreground">
                                    Clientes que receberam créditos promocionais
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={fetchParticipantes}
                            disabled={loadingParticipantes}
                            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                            title="Atualizar lista"
                        >
                            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingParticipantes ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loadingParticipantes ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : participantes.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">Nenhum participante encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Nome
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                Telefone
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4" />
                                                Créditos Disponíveis
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Data de Cadastro
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {participantes.map((participante, index) => (
                                        <tr key={participante.clienteId} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-medium text-foreground">{participante.nome}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {participante.telefone}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-semibold ${
                                                    participante.saldoDisponivel > 0 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : 'text-muted-foreground'
                                                }`}>
                                                    {formatCurrency(participante.saldoDisponivel)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {formatDate(participante.dataCredito)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Content>
    );
};

export default PromocoesAdmin;
