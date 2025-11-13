import { Navigate, useLocation } from "react-router-dom";
import authStore from "./authentica/authentication.store";

export const RotaPrivada: React.FC<{ children?: React.ReactNode }> = ({ children }) => {

    const location = useLocation();
    if (!authStore.isLoggedIn()) {
        return <Navigate to={'/login'} state={{ from: location }} replace />
    }

    return children
}