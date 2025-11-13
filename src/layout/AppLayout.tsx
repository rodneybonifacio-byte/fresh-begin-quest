import { LayoutBase } from '../layout';
import { LayoutProvider } from '../providers/LayoutContext';
import { AuthProvider } from '../providers/AuthContext';

export const AppLayout = () => {
    return (
        <AuthProvider>
            <LayoutProvider>
                <LayoutBase />
            </LayoutProvider>
        </AuthProvider>
    );
};
