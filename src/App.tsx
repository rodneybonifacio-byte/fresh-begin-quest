import { BrowserRouter } from 'react-router-dom';
import { LoaderProvider } from './providers/LoadingSpinnerContext';
import { GlobalConfigProvider } from './providers/GlobalConfigContext';
import { RouterBase } from './router';

import { InstallButton } from './components/InstallButton';
import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

// Auto-reload on chunk load failure (stale PWA cache)
// Unregisters service worker first to break the stale-cache cycle
const handleChunkError = () => {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
        sessionStorage.setItem('chunk-reload', '1');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                const unregisterAll = registrations.map((reg) => reg.unregister());
                return Promise.all(unregisterAll);
            }).finally(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }
};

window.addEventListener('error', (event) => {
    if (
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Importing a module script failed') ||
        event.message?.includes('dynamically imported module')
    ) {
        handleChunkError();
    }
});

window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('dynamically imported module')
    ) {
        handleChunkError();
    }
});


export default function App() {

    useEffect(() => {
        // enviar somente se o ambiente for produção
        if (process.env.NODE_ENV === 'production' && import.meta.env.VITE_CLARITY_ID) {
            try {
                Clarity.init(import.meta.env.VITE_CLARITY_ID);
            } catch (e) {
                console.warn('Clarity init failed:', e);
            }
        }
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