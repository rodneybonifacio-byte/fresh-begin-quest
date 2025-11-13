import { Navigate, Outlet } from "react-router-dom";
import authStore from "./authentica/authentication.store";

export const RotaPublica = () => {
    return !authStore.isLoggedIn() ? <Outlet /> : <Navigate to="/app" />;
};
