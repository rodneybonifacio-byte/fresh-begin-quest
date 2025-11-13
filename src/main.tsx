import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register';
import { ThemeProvider } from './providers/ThemeContext';

const queryClient = new QueryClient();

registerSW({ immediate: true });


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
