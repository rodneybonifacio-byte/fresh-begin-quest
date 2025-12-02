import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../../../integrations/supabase/client';
import { getSupabaseWithAuth } from '../../../../integrations/supabase/custom-auth';
import { CardComponent } from '../../../../components/card';
import { Activity, Clock, User, Monitor, Globe, RefreshCw } from 'lucide-react';
import { ButtonComponent } from '../../../../components/button';

interface LogAcesso {
    id: string;
    cliente_id: string;
    user_email: string;
    user_name: string;
    ip_address: string;
    user_agent: string;
    action: string;
    created_at: string;
}

interface SessaoAtiva {
    id: string;
    cliente_id: string;
    user_email: string;
    user_name: string;
    last_seen: string;
    is_online: boolean;
}

export default function LogsAcesso() {
    const [logs, setLogs] = useState<LogAcesso[]>([]);
    const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtiva[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const supabaseAuth = getSupabaseWithAuth();

            // Buscar logs de acesso
            const { data: logsData, error: logsError } = await supabaseAuth
                .from('logs_acesso')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (logsError) {
                console.error('Erro ao buscar logs:', logsError);
            } else {
                setLogs((logsData as LogAcesso[]) || []);
            }

            // Buscar sessões ativas
            const { data: sessoesData, error: sessoesError } = await supabaseAuth
                .from('sessoes_ativas')
                .select('*')
                .order('last_seen', { ascending: false });

            if (sessoesError) {
                console.error('Erro ao buscar sessões:', sessoesError);
            } else {
                setSessoesAtivas((sessoesData as SessaoAtiva[]) || []);
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscrição em tempo real para sessões ativas
        const channel = supabase
            .channel('sessoes-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sessoes_ativas',
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getStatusIndicator = (sessao: SessaoAtiva) => {
        const lastSeen = new Date(sessao.last_seen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;

        if (sessao.is_online && diffMinutes < 5) {
            return (
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
                </span>
            );
        } else if (diffMinutes < 15) {
            return (
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">Ausente</span>
                </span>
            );
        } else {
            return (
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                    <span className="text-muted-foreground">Offline</span>
                </span>
            );
        }
    };

    const onlineCount = sessoesAtivas.filter((s) => {
        const lastSeen = new Date(s.last_seen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
        return s.is_online && diffMinutes < 5;
    }).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Logs de Acesso</h1>
                    <p className="text-muted-foreground">Monitoramento de sessões e histórico de login</p>
                </div>
                <ButtonComponent
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </ButtonComponent>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CardComponent>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Online Agora</p>
                            <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
                        </div>
                    </div>
                </CardComponent>
                <CardComponent>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Sessões Registradas</p>
                            <p className="text-2xl font-bold text-foreground">{sessoesAtivas.length}</p>
                        </div>
                    </div>
                </CardComponent>
                <CardComponent>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Logins Hoje</p>
                            <p className="text-2xl font-bold text-foreground">
                                {logs.filter((l) => {
                                    const today = new Date();
                                    const logDate = new Date(l.created_at);
                                    return logDate.toDateString() === today.toDateString();
                                }).length}
                            </p>
                        </div>
                    </div>
                </CardComponent>
            </div>

            {/* Sessões Ativas */}
            <CardComponent>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 w-full">
                    <Activity className="w-5 h-5 text-primary" />
                    Sessões Ativas em Tempo Real
                </h2>
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full table-auto">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Usuário</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Última Atividade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sessoesAtivas.map((sessao) => (
                                <tr key={sessao.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm">{getStatusIndicator(sessao)}</td>
                                    <td className="px-4 py-3 text-sm font-medium">{sessao.user_name || '-'}</td>
                                    <td className="px-4 py-3 text-sm">{sessao.user_email || '-'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(sessao.last_seen), "dd/MM/yyyy 'às' HH:mm:ss", {
                                            locale: ptBR,
                                        })}
                                    </td>
                                </tr>
                            ))}
                            {sessoesAtivas.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted-foreground py-8">
                                        Nenhuma sessão registrada
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardComponent>

            {/* Histórico de Logs */}
            <CardComponent>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 w-full">
                    <Clock className="w-5 h-5 text-primary" />
                    Histórico de Acessos
                </h2>
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full table-auto">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Data/Hora</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Usuário</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Ação</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">IP</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Navegador</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                            locale: ptBR,
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium">{log.user_name || '-'}</td>
                                    <td className="px-4 py-3 text-sm">{log.user_email || '-'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Globe className="w-3.5 h-3.5" />
                                            {log.ip_address?.substring(0, 15) || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Monitor className="w-3.5 h-3.5" />
                                            {log.user_agent?.substring(0, 30) || '-'}...
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                                        Nenhum log de acesso encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardComponent>
        </div>
    );
}
