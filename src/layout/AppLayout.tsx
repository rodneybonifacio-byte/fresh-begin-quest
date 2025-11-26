import { LayoutBase } from '../layout';
import { LayoutProvider } from '../providers/LayoutContext';
import { AuthProvider } from '../providers/AuthContext';
import { useSyncUserData } from '../hooks/useSyncUserData';
import { useEffect, useState } from 'react';
import { RemetenteSupabaseDirectService } from '../services/RemetenteSupabaseDirectService';
import { ModalCadastrarRemetente } from '../pages/private/remetente/ModalCadastrarRemetente';

const AppLayoutContent = () => {
    useSyncUserData();

    const [isRemetenteModalOpen, setIsRemetenteModalOpen] = useState(false);
    const [verificacaoFeita, setVerificacaoFeita] = useState(false);

    useEffect(() => {
        console.log('[AppLayout] useEffect disparado', { verificacaoFeita });

        const verificarRemetentes = async () => {
            const token = localStorage.getItem('token');
            const jaVerificouNessaSessao = sessionStorage.getItem('remetente_verificado');

            console.log('[AppLayout] verificarRemetentes: início', {
                temToken: !!token,
                verificacaoFeita,
                jaVerificouNessaSessao,
            });
            
            // Só verifica se tiver token e ainda não verificou NESTA SESSÃO
            if (!token || verificacaoFeita || jaVerificouNessaSessao) {
                console.log('[AppLayout] verificação ignorada', {
                    motivo: !token
                        ? 'sem_token'
                        : verificacaoFeita
                            ? 'verificacaoFeita_state'
                            : 'sessionStorage_remetente_verificado',
                });
                return;
            }

            try {
                const service = new RemetenteSupabaseDirectService();
                const response = await service.getAll();
                const remetentes = response?.data ?? [];

                console.log('🔍 AppLayout verificação:', {
                    quantidadeRemetentes: remetentes.length,
                    remetentes,
                });

                // Marca como verificado antes de decidir abrir modal
                setVerificacaoFeita(true);
                sessionStorage.setItem('remetente_verificado', 'true');

                // Se não houver remetentes cadastrados, abre o modal explicativo
                if (remetentes.length === 0) {
                    console.log('⚠️ [AppLayout] Nenhum remetente encontrado, abrindo modal GLOBAL');
                    setIsRemetenteModalOpen(true);
                } else {
                    console.log('✅ [AppLayout] Remetente(s) encontrado(s), NÃO abre modal');
                }
            } catch (error) {
                console.error('❌ [AppLayout] Erro ao verificar remetentes do cliente:', error);
                setVerificacaoFeita(true);
                sessionStorage.setItem('remetente_verificado', 'true');
            }
        };

        void verificarRemetentes();
    }, [verificacaoFeita]);

    useEffect(() => {
        console.log('[AppLayout] estado do modal global de remetente:', {
            isRemetenteModalOpen,
        });
    }, [isRemetenteModalOpen]);

    return (
        <>
            <LayoutBase />
            <ModalCadastrarRemetente
                isOpen={isRemetenteModalOpen}
                onCancel={() => setIsRemetenteModalOpen(false)}
                showWelcomeMessage
            />
        </>
    );
};

export const AppLayout = () => {
    return (
        <AuthProvider>
            <LayoutProvider>
                <AppLayoutContent />
            </LayoutProvider>
        </AuthProvider>
    );
};
