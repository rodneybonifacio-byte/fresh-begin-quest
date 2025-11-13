import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import authStore from "../authentica/authentication.store";

interface ProtectedRouteProps {
    requiredPermission?: string | string[];
    // opcionalmente, você pode adicionar outros parâmetros, como requiredRole
    children?: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission, children }) => {
    // Obtém as permissões do usuário a partir do token
    const userPermissions = authStore.getPermissions();

    // Verifica se o usuário possui a permissão exigida
    let hasPermission = true;
    if (requiredPermission) {
        if (typeof requiredPermission === "string") {
            hasPermission = userPermissions.includes(requiredPermission);
        } else if (Array.isArray(requiredPermission)) {
            hasPermission = requiredPermission.some((perm) => userPermissions.includes(perm));
        }
    }

    // Se não possuir, redireciona para uma página de erro (ou pode exibir um toast)
    if (!hasPermission) {
        return <Navigate to="/error" replace />;
    }

    // Se as permissões estiverem ok, renderiza o conteúdo protegido
    return children ? children : <Outlet />;
};

export default ProtectedRoute;
