import { Gift, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const PromoBannerRecarga = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="relative bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 text-white overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.3),transparent_50%)]" />
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
            </div>

            <div className="container mx-auto px-4 py-3 relative">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 animate-pulse">
                        <Gift className="h-5 w-5" />
                        <span className="font-bold text-sm sm:text-base">PROMOÇÃO:</span>
                    </div>
                    
                    <span className="text-sm sm:text-base text-center">
                        Coloque <span className="font-bold text-yellow-300">R$100</span> e ganhe 
                        <span className="font-bold text-yellow-300 ml-1">+R$50</span> em créditos!
                    </span>

                    <button 
                        onClick={() => navigate('/app/financeiro/recarga')}
                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    >
                        Recarregar agora
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Close button */}
            <button 
                onClick={() => setIsVisible(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Fechar banner"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};
