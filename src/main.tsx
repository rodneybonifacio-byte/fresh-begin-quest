import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register';
import { ThemeProvider } from './providers/ThemeContext';

const queryClient = new QueryClient();

// Registrar Service Worker com atualização automática
const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        // Nova versão disponível - atualizar automaticamente
        console.log('🔄 Nova versão disponível, atualizando...');
        toast.info('Atualizando para nova versão...', { duration: 2000 });
        // Espera 1.5s para mostrar o toast, depois atualiza
        setTimeout(() => {
            updateSW(true);
        }, 1500);
    },
    onOfflineReady() {
        console.log('✅ App pronto para uso offline');
    },
    onRegisteredSW(swUrl, registration) {
        console.log('✅ Service Worker registrado:', swUrl);
        // Verificar atualizações a cada 1 minuto
        if (registration) {
            setInterval(() => {
                registration.update();
            }, 60 * 1000);
        }
    },
    onRegisterError(error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <App />
                <Toaster richColors />
            </QueryClientProvider>
        </ThemeProvider>
    </StrictMode>,
)
