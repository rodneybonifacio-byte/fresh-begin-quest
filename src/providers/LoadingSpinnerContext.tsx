import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadSpinner } from '../components/loading';

interface LoaderContextProps {
    isSpinnerLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoaderContext = createContext<LoaderContextProps | undefined>(undefined);

export const useLoadingSpinner = () => {
    const context = useContext(LoaderContext);
    if (context === undefined) {
        throw new Error("useLoader must be used within a LoaderProvider");
    }
    return context;
};

interface LoaderProviderProps {
    children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
    const [isSpinnerLoading, setIsLoading] = useState(false);

    return (
        <LoaderContext.Provider value={{ isSpinnerLoading, setIsLoading }}>
            
            {isSpinnerLoading && (
                <LoadSpinner mensagem="Carregando..." />
            )}

            {children}
        </LoaderContext.Provider>
    );
};
