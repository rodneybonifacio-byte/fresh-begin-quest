import { Power } from "lucide-react";
import authStore from "../../authentica/authentication.store";

type LogoutProps = {
    label?: string | null;
}

export const handleLogout = () => {
    localStorage.removeItem('token');
    authStore.logout();
    window.location.href = `/`;
};

export const LogoutApp: React.FC<LogoutProps> = ({ label }) => {
    return (
        <button
            onClick={handleLogout}
            className="flex flex-row text-danger gap-4 items-center w-auto justify-between cursor-pointer p-2 mr-1 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-danger-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600">
            <Power size={18} />
            {label && label !== null && label !== undefined ? <span>{label}</span> : ""}
        </button>
    );
};