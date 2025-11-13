import { BrowserRouter } from 'react-router-dom';
import { LoaderProvider } from './providers/LoadingSpinnerContext';
import { GlobalConfigProvider } from './providers/GlobalConfigContext';
import { RouterBase } from './router';
import { IdleProvider } from './providers/IdleProvider';
import { InstallButton } from '../install-button';
import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import { useTheme } from './hooks/useTheme';


export default function App() {
    // Inicializa o tema global
    useTheme();

    useEffect(() => {
        // enviar somente se o ambiente for produção
        if (process.env.NODE_ENV === 'production')
            Clarity.init(import.meta.env.VITE_CLARITY_ID); // substitua pelo ID do seu projeto Clarity
    }, []);

    const locationPath = '/';
    return (
        <BrowserRouter basename={locationPath}>
            <LoaderProvider>
                <GlobalConfigProvider>
                    <IdleProvider>
                        <RouterBase />
                        <InstallButton />
                    </IdleProvider>
                </GlobalConfigProvider>
            </LoaderProvider>
        </BrowserRouter>
    );
}