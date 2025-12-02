import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import authStore from '../authentica/authentication.store';
import type { TokenPayload } from '../types/ITokenPayload';

const HEARTBEAT_INTERVAL = 30000; // 30 segundos

export function usePresenceTracking() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const updatePresence = useCallback(async (isOnline: boolean) => {
        const user = authStore.getUser() as TokenPayload | null;
        if (!user?.clienteId) return;

        try {
            await supabase.functions.invoke('atualizar-presenca', {
                body: {
                    clienteId: user.clienteId,
                    userEmail: user.email,
                    userName: user.name,
                    isOnline,
                    lastSeen: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error('Erro ao atualizar presença:', error);
        }
    }, []);

    const setupRealtimePresence = useCallback(() => {
        const user = authStore.getUser() as TokenPayload | null;
        if (!user?.clienteId) return;

        // Canal de presença para tracking em tempo real
        const channel = supabase.channel('user-presence', {
            config: {
                presence: {
                    key: user.clienteId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('Presença sincronizada:', state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: unknown[] }) => {
                console.log('Usuário entrou:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: unknown[] }) => {
                console.log('Usuário saiu:', key, leftPresences);
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        clienteId: user.clienteId,
                        email: user.email,
                        name: user.name,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        channelRef.current = channel;
    }, []);

    useEffect(() => {
        const user = authStore.getUser() as TokenPayload | null;
        if (!user?.clienteId) return;

        // Marcar como online ao montar
        updatePresence(true);
        setupRealtimePresence();

        // Heartbeat para manter sessão ativa
        intervalRef.current = setInterval(() => {
            updatePresence(true);
        }, HEARTBEAT_INTERVAL);

        // Eventos de visibilidade da página
        const handleVisibilityChange = () => {
            if (document.hidden) {
                updatePresence(false);
            } else {
                updatePresence(true);
            }
        };

        // Evento de saída da página
        const handleBeforeUnload = () => {
            updatePresence(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            updatePresence(false);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [updatePresence, setupRealtimePresence]);
}
