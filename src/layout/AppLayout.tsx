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

    useEffect(() => {
        const verificarRemetentes = async () => {
            try {
                const service = new RemetenteSupabaseDirectService();
                const response = await service.getAll();
                const remetentes = response?.data ?? [];

                console.log('🔍 AppLayout verificação:', {
                    quantidadeRemetentes: remetentes.length,
                    remetentes: remetentes
                });

                // Se não houver remetentes cadastrados, abre o modal explicativo
                if (remetentes.length === 0) {
                    console.log('⚠️ Nenhum remetente encontrado, abrindo modal');
                    setIsRemetenteModalOpen(true);
                } else {
                    console.log('✅ Remetente(s) encontrado(s), não abre modal');
                }
            } catch (error) {
                console.error('❌ Erro ao verificar remetentes do cliente:', error);
                // Se houver erro (ex: sem token, sem remetentes), abre modal
                console.log('⚠️ Erro ao buscar remetentes, abrindo modal para cadastro');
                setIsRemetenteModalOpen(true);
            }
        };

        void verificarRemetentes();
    }, []);

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
