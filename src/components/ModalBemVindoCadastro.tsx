import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, CheckCircle, PartyPopper, X } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

interface ModalBemVindoCadastroProps {
  isOpen: boolean;
  onClose: () => void;
  posicaoCadastro?: number;
}

export const ModalBemVindoCadastro = ({ 
  isOpen, 
  onClose,
  posicaoCadastro = 0 
}: ModalBemVindoCadastroProps) => {
  const [contadorAtual, setContadorAtual] = useState(posicaoCadastro);
  const [limiteTotal] = useState(100);
  const [elegivel, setElegivel] = useState(posicaoCadastro <= 105);

  useEffect(() => {
    if (isOpen) {
      // Buscar contador atual
      const fetchContador = async () => {
        try {
          const { data, error } = await supabase
            .from('contador_cadastros')
            .select('contador, limite')
            .eq('tipo', 'primeiros_cadastros')
            .single();
          
          if (!error && data) {
            setContadorAtual(data.contador);
            setElegivel(data.contador <= data.limite);
          }
        } catch (err) {
          console.error('Erro ao buscar contador:', err);
        }
      };
      
      fetchContador();
      document.body.classList.add("overflow-hidden");
    }
    
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  const vagasRestantes = Math.max(0, limiteTotal - contadorAtual);
  const progressoPercentual = Math.min((contadorAtual / limiteTotal) * 100, 100);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-primary/20"
        >
          {/* Banner Header */}
          <div className="relative h-40 bg-gradient-to-r from-primary via-orange-500 to-amber-500 overflow-hidden">
            {/* Confetti Effect */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
                    left: `${Math.random() * 100}%`,
                    top: `-10%`,
                  }}
                  animate={{
                    y: ['0%', '500%'],
                    rotate: [0, 360],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
            
            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <PartyPopper className="w-12 h-12 text-white" />
              </motion.div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Welcome Message */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium text-sm">Cadastro Recebido!</span>
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white">
                Bem-vindo ao <span className="text-primary">BRHUB Envios</span>! 🎉
              </h2>
              
              <p className="text-white/80 text-sm leading-relaxed">
                Seu cadastro foi recebido com sucesso! Assim que aprovado, você receberá uma mensagem no seu <span className="text-green-400 font-semibold">WhatsApp</span> com os dados de acesso.
              </p>
            </div>

            {/* Promo Section */}
            {elegivel && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary/10 border border-amber-500/30 rounded-2xl overflow-hidden"
              >
                {/* Shine Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
                
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-xl">
                      <Gift className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-amber-400 font-bold text-lg">Promoção de Lançamento!</p>
                      <p className="text-white/60 text-xs">Para os 100 primeiros cadastros</p>
                    </div>
                  </div>
                  
                  {/* Prize Amount */}
                  <div className="flex items-center justify-center gap-2 py-3">
                    <span className="text-white/70 text-lg">Ganhe</span>
                    <motion.span
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-4xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-primary bg-clip-text text-transparent"
                    >
                      R$ 50
                    </motion.span>
                    <span className="text-white/70 text-lg">em créditos!</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Vagas preenchidas</span>
                      <span className="text-amber-400 font-semibold">
                        {contadorAtual} de {limiteTotal}
                      </span>
                    </div>
                    
                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressoPercentual}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className="absolute h-full bg-gradient-to-r from-amber-500 via-orange-500 to-primary rounded-full"
                      />
                      
                      {/* Shimmer Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50">
                        {vagasRestantes > 0 
                          ? `Restam apenas ${vagasRestantes} vagas!` 
                          : 'Promoção encerrada!'}
                      </span>
                      {vagasRestantes > 0 && vagasRestantes <= 20 && (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-xs text-red-400 font-semibold"
                        >
                          🔥 Últimas vagas!
                        </motion.span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full py-4 bg-gradient-to-r from-primary via-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
            >
              Entendido! 👍
            </motion.button>
            
            <p className="text-center text-xs text-white/50">
              Fique atento ao seu WhatsApp para receber as notificações
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
