import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

export const InstallAppButtons = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Capturar evento de instalação (Android/Chrome)
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installAndroid = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            // Fallback: mostrar instruções manuais
            alert('Para instalar o app:\n\n1. Toque nos 3 pontos (⋮) no canto superior\n2. Selecione "Adicionar à tela inicial"\n3. Confirme a instalação');
        }
    };

    const installIOS = () => {
        setShowIOSInstructions(true);
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground mb-2">
                Baixe o app no seu celular
            </p>
            
            <div className="flex gap-2">
                {/* Botão Android */}
                <button
                    type="button"
                    onClick={installAndroid}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#3DDC84]/10 hover:bg-[#3DDC84]/20 border border-[#3DDC84]/30 text-foreground rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#3DDC84]">
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5765-6.1185-9.4396"/>
                    </svg>
                    <span>Android</span>
                </button>

                {/* Botão iOS */}
                <button
                    type="button"
                    onClick={installIOS}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-foreground/5 hover:bg-foreground/10 border border-foreground/20 text-foreground rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span>iPhone</span>
                </button>
            </div>

            {/* Modal de instruções iOS */}
            {showIOSInstructions && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowIOSInstructions(false)}>
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Smartphone className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Instalar no iPhone</h3>
                        </div>
                        
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                <p>Toque no botão <strong className="text-foreground">Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                <p>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                <p>Toque em <strong className="text-foreground">"Adicionar"</strong> no canto superior direito</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSInstructions(false)}
                            className="w-full mt-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
