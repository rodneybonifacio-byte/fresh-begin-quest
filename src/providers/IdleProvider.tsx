import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { handleLogout } from '../components/menu/logout';

interface IdleContextData {
    resetIdleTimer: () => void;
}

const IdleContext = createContext<IdleContextData | undefined>(undefined);

interface IdleProviderProps {
    children: ReactNode;
}

export const IdleProvider: React.FC<IdleProviderProps> = ({ children }) => {

    const handleOnIdle = useCallback(() => {
        handleLogout();
    }, [history]);

    const idleTimer = useIdleTimer({
        timeout: 60 * 60 * 1000, 
        onIdle: handleOnIdle,
        debounce: 500,
    });

    const resetIdleTimer = idleTimer.reset;

    return (
        <IdleContext.Provider value={{ resetIdleTimer }}>
            {children}
        </IdleContext.Provider>
    );
};

export const useIdle = (): IdleContextData => {
    const context = useContext(IdleContext);
    if (!context) {
        throw new Error('useIdle deve ser usado dentro do IdleProvider');
    }
    return context;
};
