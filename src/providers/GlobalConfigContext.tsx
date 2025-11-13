import { createContext, useContext } from "react";

interface GlobalConfig {
    pagination: {
        default: number,
        perPage: number
    }
}

export const GlobalConfigContext = createContext<GlobalConfig | undefined>(undefined);

export const GlobalConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
    const config = {
        pagination: {
            default: 1,
            perPage: 30
        }
    };

    return (
        <GlobalConfigContext.Provider value={{ pagination: config.pagination }}>
            {children}
        </GlobalConfigContext.Provider>
    );
};

export const useGlobalConfig = () => {
    const context = useContext(GlobalConfigContext);
    if (!context) {
        throw new Error('useGlobalConfig must be used within a GlobalConfigProvider');
    }
    return context;
}