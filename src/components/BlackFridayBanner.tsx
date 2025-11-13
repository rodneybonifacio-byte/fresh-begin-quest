import { X, Zap } from 'lucide-react';
import { useState } from 'react';

export const BlackFridayBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-black via-gray-900 to-black border-b-4 border-yellow-400 overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,215,0,0.1)_10px,rgba(255,215,0,0.1)_20px)]" />
      </div>

      <div className="container mx-auto px-4 py-3 relative">
        <div className="flex items-center justify-center gap-3 text-center">
          {/* Lightning icons */}
          <Zap className="h-5 w-5 text-yellow-400 animate-pulse hidden sm:block" fill="currentColor" />
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <span className="text-yellow-400 font-black text-lg sm:text-xl tracking-wider animate-pulse">
              BLACK FRIDAY
            </span>
            <span className="text-white font-bold text-base sm:text-lg">
              Descontos imperdíveis no frete! 🔥
            </span>
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full font-black text-sm sm:text-base animate-bounce">
              ATÉ 80% OFF
            </span>
          </div>

          <Zap className="h-5 w-5 text-yellow-400 animate-pulse hidden sm:block" fill="currentColor" />
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Fechar banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom shine effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" />
    </div>
  );
};
