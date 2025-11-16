import { LayoutBase } from '../layout';
import { LayoutProvider } from '../providers/LayoutContext';
import { AuthProvider } from '../providers/AuthContext';
import { useSyncUserData } from '../hooks/useSyncUserData';

const AppLayoutContent = () => {
    useSyncUserData();
    return <LayoutBase />;
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
