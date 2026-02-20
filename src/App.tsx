import { BrowserRouter } from 'react-router-dom';
import { LoaderProvider } from './providers/LoadingSpinnerContext';
import { GlobalConfigProvider } from './providers/GlobalConfigContext';
import { RouterBase } from './router';

import { InstallButton } from './components/InstallButton';
import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

// Auto-reload on chunk load failure (stale PWA cache)
window.addEventListener('error', (event) => {
    if (
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Importing a module script failed')
    ) {
        const reloaded = sessionStorage.getItem('chunk-reload');
        if (!reloaded) {
            sessionStorage.setItem('chunk-reload', '1');
            window.location.reload();
        }
    }
});
window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
        const reloaded = sessionStorage.getItem('chunk-reload');
        if (!reloaded) {
            sessionStorage.setItem('chunk-reload', '1');
            window.location.reload();
        }
    }
});


export default function App() {

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
                    <RouterBase />
                    <InstallButton />
                </GlobalConfigProvider>
            </LoaderProvider>
        </BrowserRouter>
    );
}