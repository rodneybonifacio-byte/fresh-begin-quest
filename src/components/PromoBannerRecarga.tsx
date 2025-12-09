import { ArrowRight, X, Sparkles, Zap, Gift } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PromoBannerRecargaProps {
    variant?: 'default' | 'featured';
}

export const PromoBannerRecarga = ({ variant = 'default' }: PromoBannerRecargaProps) => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    // Versão destacada para páginas públicas (login, cadastro) - COMPACTA
    if (variant === 'featured') {
        return (
            <div className="relative bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-white overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.08),transparent_70%)]" />
                
                <div className="relative px-4 py-3">
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white z-10"
                        aria-label="Fechar"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <button 
                        onClick={() => navigate('/app/financeiro/recarga')}
                        className="w-full flex items-center justify-center gap-3 pr-6"
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0 p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
                            <Gift className="h-5 w-5 text-black" />
                        </div>

                        {/* Text - Mobile optimized */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-400">Recarregue</span>
                            <span className="font-bold text-yellow-400">R$100</span>
                            <span className="text-zinc-400">→</span>
                            <span className="font-bold text-orange-400 animate-pulse">+R$50</span>
                            <span className="text-zinc-500 hidden sm:inline">grátis</span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    </button>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
            </div>
        );
    }

    // Versão padrão compacta para o layout logado
    return (
        <div className="relative bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-white overflow-hidden border-b border-yellow-500/20">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.06),transparent_70%)]" />

            <div className="relative px-4 py-2.5">
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white z-10"
                    aria-label="Fechar"
                >
                    <X className="h-4 w-4" />
                </button>

                <button 
                    onClick={() => navigate('/app/financeiro/recarga')}
                    className="w-full flex items-center justify-center gap-2 sm:gap-3 pr-6"
                >
                    <Sparkles className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <span className="text-zinc-400">Recarregue</span>
                        <span className="font-bold text-yellow-400">R$100</span>
                        <span className="text-zinc-500">e ganhe</span>
                        <span className="font-bold text-orange-400 animate-pulse">+R$50</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0">
                        <Zap className="h-3 w-3" />
                        <span className="hidden sm:inline">Aproveitar</span>
                        <ArrowRight className="h-3 w-3" />
                    </div>
                </button>
            </div>
        </div>
    );
};
