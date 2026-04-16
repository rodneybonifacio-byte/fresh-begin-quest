import { toast } from 'sonner';
import { Package, CheckCircle2, Printer } from 'lucide-react';

// Som de sucesso "ka-ching" mais agradável - gerado como PCM
const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Nota 1 - tom agudo curto
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.08);
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.3);

    // Nota 2 - tom mais agudo (harmonia)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1);
    osc2.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.1);
    osc2.stop(audioCtx.currentTime + 0.5);

    // Nota 3 - acorde final
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.2);
    gain3.gain.setValueAtTime(0, audioCtx.currentTime);
    gain3.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(audioCtx.currentTime + 0.2);
    osc3.stop(audioCtx.currentTime + 0.7);

    setTimeout(() => audioCtx.close(), 1000);
  } catch {
    // Silencioso se AudioContext não disponível
  }
};

interface EtiquetaToastProps {
  destinatario?: string;
  servico?: string;
  codigoRastreio?: string;
  onImprimir?: () => void;
}

export const showEtiquetaGeradaToast = (props?: EtiquetaToastProps) => {
  const { destinatario, servico, codigoRastreio, onImprimir } = props || {};

  playSuccessSound();

  toast.custom(
    (t) => (
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl shadow-2xl p-4 max-w-md animate-in slide-in-from-top-5 duration-500">
        <div className="flex items-start gap-3">
          {/* Ícone animado */}
          <div className="bg-white/20 rounded-full p-2.5 backdrop-blur-sm shrink-0 animate-[pulse_1s_ease-in-out_1]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base mb-0.5 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Etiqueta Gerada! 🎉
            </h3>

            {destinatario && (
              <p className="text-sm text-white/90 truncate">
                Para: <strong>{destinatario}</strong>
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {servico && (
                <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5 backdrop-blur-sm font-medium">
                  {servico}
                </span>
              )}
              {codigoRastreio && (
                <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5 backdrop-blur-sm font-mono">
                  {codigoRastreio}
                </span>
              )}
            </div>

            {onImprimir && (
              <button
                onClick={() => {
                  onImprimir();
                  toast.dismiss(t);
                }}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold bg-white/25 hover:bg-white/35 transition-colors rounded-lg px-3 py-1.5 backdrop-blur-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
            )}
          </div>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: 'top-right',
    }
  );
};
