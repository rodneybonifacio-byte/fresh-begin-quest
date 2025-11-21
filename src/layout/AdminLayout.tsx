import { LayoutProvider } from "../providers/LayoutContext";
import { AdminLayoutBase } from "./AdminLayoutBase";
import { AuthProvider } from "../providers/AuthContext";

export const baseUrlAdmin = 'admin';

const AdminLayout = () => {
    return (
        <AuthProvider>
            <LayoutProvider>
                <AdminLayoutBase />
            </LayoutProvider>
        </AuthProvider>
    )
}

export default AdminLayout;