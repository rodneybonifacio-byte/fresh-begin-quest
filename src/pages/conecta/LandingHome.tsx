import { motion } from 'framer-motion';
import { ArrowRight, Package, Search, Truck, MapPin, Clock, Shield, Zap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const LandingHome = () => {
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState('');

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } }
  };

  const handleTrack = () => {
    if (trackingCode.trim()) {
      window.open(`/rastreio/encomenda?codigo=${trackingCode.trim()}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-brand-black-900 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-brand-black-900/95 border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-white">
                BRHUB
              </span>
              <span className="text-2xl font-light tracking-tight text-brand-orange ml-1">
                ENVIOS
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/login')} className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              Plataforma
            </button>
            <button onClick={() => navigate('/conecta')} className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              Conecta+
            </button>
            <button onClick={() => navigate('/apidocs')} className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              API
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/cadastro-cliente')}
              className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-600 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-brand-orange/25 hover:shadow-brand-orange/40"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark with Orange Accents */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 min-h-[90vh] flex items-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-orange/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-orange/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          className="container mx-auto max-w-6xl relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div>
              <motion.div variants={fadeInUp} className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-sm font-medium">
                  <Zap className="w-4 h-4" />
                  Plataforma líder em logística
                </span>
              </motion.div>

              <motion.h1 
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6"
              >
                Envie com{' '}
                <span className="text-brand-orange">
                  até 80%
                </span>
                <br />
                de desconto
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg text-white/60 max-w-md mb-8"
              >
                Plataforma completa para emissão de etiquetas. Correios e transportadoras com os melhores preços do mercado.
              </motion.p>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4"
              >
                <button 
                  onClick={() => navigate('/cadastro-cliente')}
                  className="group flex items-center justify-center gap-3 px-8 py-4 bg-brand-orange hover:bg-brand-orange-600 rounded-lg text-lg font-semibold text-white transition-all shadow-2xl shadow-brand-orange/30 hover:shadow-brand-orange/50"
                >
                  Começar Grátis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/conecta')}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-lg font-medium text-white transition-all"
                >
                  Seja Parceiro
                </button>
              </motion.div>
            </div>

            {/* Right Column - Tracking Box */}
            <motion.div 
              variants={fadeInUp}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/20 flex items-center justify-center">
                    <Search className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Rastreie sua encomenda</h3>
                    <p className="text-sm text-white/50">Digite o código de rastreamento</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Ex: AB123456789BR"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                  />
                  <button
                    onClick={handleTrack}
                    className="px-6 py-3 bg-brand-orange hover:bg-brand-orange-600 rounded-lg font-semibold text-white transition-all flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Rastrear
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
                  {[
                    { value: '50K+', label: 'Envios/mês' },
                    { value: '80%', label: 'Economia' },
                    { value: '99%', label: 'Entrega' }
                  ].map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-xl font-bold text-brand-orange">{stat.value}</div>
                      <div className="text-xs text-white/50">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 px-4 py-2 bg-brand-orange rounded-full text-sm font-semibold text-white shadow-lg shadow-brand-orange/30">
                Sem mensalidades
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6 bg-brand-black-800 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-orange text-sm font-semibold uppercase tracking-wider">Serviços</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Plataforma completa de logística para seu negócio
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: 'Emissão de Etiquetas', desc: 'Gere etiquetas em segundos com os melhores preços' },
              { icon: Truck, title: 'Multi-transportadora', desc: 'Correios, Rodonave e mais opções' },
              { icon: MapPin, title: 'Rastreamento', desc: 'Acompanhe todas suas encomendas em tempo real' },
              { icon: Clock, title: 'Coleta Agendada', desc: 'Agendamento de coletas no Brás-SP' }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-orange/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-orange/10 group-hover:bg-brand-orange/20 flex items-center justify-center mb-4 transition-colors">
                  <item.icon className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-white/50">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 bg-brand-black-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-orange text-sm font-semibold uppercase tracking-wider">Como Funciona</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">
              Simples e rápido
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Cadastre-se', desc: 'Crie sua conta grátis em menos de 1 minuto' },
              { step: '02', title: 'Emita Etiquetas', desc: 'Escolha a melhor opção de frete e gere sua etiqueta' },
              { step: '03', title: 'Envie', desc: 'Deixe na coleta ou leve a uma agência' }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
              >
                <div className="text-6xl font-black text-brand-orange/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-white/50">{item.desc}</p>
                
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                    <ChevronRight className="w-8 h-8 text-white/20" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-4 sm:px-6 bg-brand-orange">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Clientes Ativos' },
              { value: '500K+', label: 'Etiquetas Geradas' },
              { value: '80%', label: 'Economia Média' },
              { value: '24/7', label: 'Suporte' }
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-3xl sm:text-4xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 bg-brand-black-900">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-brand-black-800 to-brand-black-900 border border-white/10 text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-[100px]" />
            
            <div className="relative z-10">
              <Shield className="w-12 h-12 text-brand-orange mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para economizar?
              </h2>
              <p className="text-white/60 mb-8 max-w-lg mx-auto">
                Junte-se a milhares de lojistas que já economizam com a BRHUB Envios
              </p>
              <button 
                onClick={() => navigate('/cadastro-cliente')}
                className="group px-8 py-4 bg-brand-orange hover:bg-brand-orange-600 rounded-lg text-lg font-semibold text-white transition-all shadow-2xl shadow-brand-orange/30 hover:shadow-brand-orange/50 inline-flex items-center gap-3"
              >
                Criar conta gratuita
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-white/5 bg-brand-black-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">BRHUB</span>
              <span className="text-xl font-light text-brand-orange">ENVIOS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <button onClick={() => navigate('/apidocs')} className="hover:text-white transition-colors">
                API
              </button>
              <button onClick={() => navigate('/conecta')} className="hover:text-white transition-colors">
                Conecta+
              </button>
              <span>© 2025 BRHUB. Todos os direitos reservados.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHome;
