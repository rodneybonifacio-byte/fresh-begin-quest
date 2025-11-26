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

                // Se não houver remetentes cadastrados, abre o modal explicativo
                if (remetentes.length === 0) {
                    setIsRemetenteModalOpen(true);
                }
            } catch (error) {
                console.error('Erro ao verificar remetentes do cliente:', error);
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
