import { ArrowRight, X, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const PromoBannerRecarga = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="relative bg-gradient-to-r from-black via-zinc-900 to-black text-white overflow-hidden border-b border-yellow-500/30">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_50%,rgba(234,179,8,0.15),transparent_40%)]" />
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_50%,rgba(249,115,22,0.15),transparent_40%)]" />
                {/* Sparkle effects */}
                <div className="absolute top-1 left-[10%] w-1 h-1 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-3 left-[25%] w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-100" />
                <div className="absolute bottom-2 left-[40%] w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-200" />
                <div className="absolute top-2 right-[30%] w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-300" />
                <div className="absolute bottom-1 right-[15%] w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-150" />
            </div>

            <div className="container mx-auto px-4 py-3 relative">
                <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                    {/* Icon with glow */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                            <div className="absolute inset-0 blur-sm bg-yellow-400/50 rounded-full" />
                        </div>
                        <span className="font-black text-sm sm:text-base tracking-wider">
                            <span className="text-yellow-400">SUPER</span>
                            <span className="text-orange-400 ml-1">PROMO</span>
                        </span>
                    </div>
                    
                    {/* Main text */}
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                        <span className="text-zinc-300">Recarregue</span>
                        <span className="font-black text-yellow-400 text-lg sm:text-xl px-2 py-0.5 bg-yellow-400/10 rounded border border-yellow-400/30">
                            R$100
                        </span>
                        <span className="text-zinc-300">e ganhe</span>
                        <span className="font-black text-orange-400 text-lg sm:text-xl px-2 py-0.5 bg-orange-400/10 rounded border border-orange-400/30 animate-pulse">
                            +R$50
                        </span>
                        <span className="hidden sm:inline text-zinc-400">em créditos!</span>
                    </div>

                    {/* CTA Button */}
                    <button 
                        onClick={() => navigate('/app/financeiro/recarga')}
                        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30"
                    >
                        <Zap className="h-4 w-4" />
                        <span className="hidden sm:inline">Aproveitar</span>
                        <span className="sm:hidden">Ir</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Close button */}
            <button 
                onClick={() => setIsVisible(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                aria-label="Fechar banner"
            >
                <X className="h-4 w-4" />
            </button>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
        </div>
    );
};
