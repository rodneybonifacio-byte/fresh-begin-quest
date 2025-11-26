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
        const verificarRemetentes = async () => {
            const token = localStorage.getItem('token');
            
            // Só verifica se tiver token e ainda não verificou
            if (!token || verificacaoFeita) {
                return;
            }

            try {
                const service = new RemetenteSupabaseDirectService();
                const response = await service.getAll();
                const remetentes = response?.data ?? [];

                console.log('🔍 AppLayout verificação:', {
                    quantidadeRemetentes: remetentes.length,
                    remetentes: remetentes
                });

                // Marca como verificado antes de decidir abrir modal
                setVerificacaoFeita(true);

                // Se não houver remetentes cadastrados, abre o modal explicativo
                if (remetentes.length === 0) {
                    console.log('⚠️ Nenhum remetente encontrado, abrindo modal');
                    setIsRemetenteModalOpen(true);
                } else {
                    console.log('✅ Remetente(s) encontrado(s), não abre modal');
                }
            } catch (error) {
                console.error('❌ Erro ao verificar remetentes do cliente:', error);
                setVerificacaoFeita(true);
            }
        };

        void verificarRemetentes();
    }, [verificacaoFeita]);

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
