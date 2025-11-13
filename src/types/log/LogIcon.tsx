import React from "react";
import { Info, XCircle, BugPlay, ShieldAlert } from "lucide-react";

export type ApiLogLevel = "Information" | "Debug" | "Warning" | "Error"; // Valores vindos da API
interface LogIconProps {
    level: ApiLogLevel;
}

export const LogIcon: React.FC<LogIconProps> = ({ level }) => {
    // Mapeia os níveis para ícones
    const icons: Record<ApiLogLevel, JSX.Element> = {
        Information: <Info />,
        Debug: <BugPlay />,
        Warning: <ShieldAlert />,
        Error: <XCircle />,
    };

    // Renderiza o ícone com base no nível
    return <>{icons[level] || <Info />}</>;
};
