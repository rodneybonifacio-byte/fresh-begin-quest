import { motion } from 'framer-motion';
import { ArrowRight, Package, Search, Truck, MapPin, Clock, Shield, Users, Globe, CheckCircle } from 'lucide-react';
import logoBrhub from '@/assets/logo-brhub-new.png';
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
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <img src={logoBrhub} alt="BRHUB ENVIOS" className="h-20 w-auto" />
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Plataforma
            </button>
            <button onClick={() => navigate('/conecta')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              Conecta+
            </button>
            <button onClick={() => navigate('/apidocs')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              API
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/cadastro-cliente')}
              className="px-5 py-2.5 bg-[#F37021] hover:bg-[#D25C12] rounded-lg text-sm font-semibold text-white transition-all"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 bg-gradient-to-br from-white via-orange-50/30 to-white">
        <motion.div 
          className="container mx-auto max-w-6xl"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div>
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6 text-gray-900"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
              >
                Envie com{' '}
                <span className="text-[#F37021]">até 80%</span>
                <br />
                de desconto
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg text-gray-600 max-w-md mb-8"
              >
                Plataforma completa para emissão de etiquetas. Correios e transportadoras com os melhores preços do mercado.
              </motion.p>

              {/* Tracking Bar */}
              <motion.div 
                variants={fadeInUp}
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-[#F37021]" />
                  <span className="font-semibold text-gray-900">Rastreie sua encomenda</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Ex: AB123456789BR"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                  <button
                    onClick={handleTrack}
                    className="px-6 py-3 bg-[#F37021] hover:bg-[#D25C12] rounded-lg font-semibold text-white transition-all"
                  >
                    Rastrear
                  </button>
                </div>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4"
              >
                <button 
                  onClick={() => navigate('/cadastro-cliente')}
                  className="group flex items-center justify-center gap-3 px-8 py-4 bg-[#F37021] hover:bg-[#D25C12] rounded-lg text-lg font-semibold text-white transition-all shadow-lg shadow-[#F37021]/20"
                >
                  Começar Grátis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/conecta')}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-lg text-lg font-medium text-gray-700 transition-all"
                >
                  Seja Parceiro
                </button>
              </motion.div>
            </div>

            {/* Right Column - Illustration/Stats */}
            <motion.div 
              variants={fadeInUp}
              className="relative hidden lg:block"
            >
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-3xl p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-[#F37021]/20 rounded-full blur-xl" />
                <div className="absolute bottom-8 left-8 w-32 h-32 bg-[#F37021]/10 rounded-full blur-2xl" />
                
                {/* Stats Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-6">
                  {[
                    { value: '50K+', label: 'Envios/mês', icon: Package },
                    { value: '80%', label: 'Economia', icon: Shield },
                    { value: '5K+', label: 'Clientes', icon: Users },
                    { value: '99%', label: 'Entrega', icon: CheckCircle }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                      <stat.icon className="w-6 h-6 text-[#F37021] mb-2" />
                      <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Our Services Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[#F37021] text-sm font-semibold uppercase tracking-wider">Nossos Serviços</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-4 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Soluções completas para seu negócio
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: 'Emissão de Etiquetas', desc: 'Gere etiquetas em segundos com os melhores preços' },
              { icon: Truck, title: 'Multi-transportadora', desc: 'Correios, Rodonave e mais opções' },
              { icon: MapPin, title: 'Rastreamento', desc: 'Acompanhe todas suas encomendas' },
              { icon: Clock, title: 'Coleta Agendada', desc: 'Agendamento de coletas no Brás-SP' }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="group p-6 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#F37021] transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="w-14 h-14 rounded-xl bg-[#F37021]/10 group-hover:bg-[#F37021] flex items-center justify-center mb-4 transition-colors">
                  <item.icon className="w-7 h-7 text-[#F37021] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[#F37021] text-sm font-semibold uppercase tracking-wider">Preços</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-4 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Créditos para enviar
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Recarregue seus créditos e comece a economizar
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { value: 'R$ 50', bonus: '', popular: false },
              { value: 'R$ 100', bonus: '+5% bônus', popular: true },
              { value: 'R$ 200', bonus: '+10% bônus', popular: false }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className={`relative p-8 rounded-2xl text-center transition-all ${
                  item.popular 
                    ? 'bg-[#F37021] text-white shadow-xl shadow-[#F37021]/30 scale-105' 
                    : 'bg-white border-2 border-gray-100 hover:border-[#F37021]'
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                {item.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </div>
                )}
                <div className={`text-4xl font-black mb-2 ${item.popular ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {item.value}
                </div>
                {item.bonus && (
                  <div className={`text-sm font-medium ${item.popular ? 'text-white/80' : 'text-[#F37021]'}`}>
                    {item.bonus}
                  </div>
                )}
                <button 
                  onClick={() => navigate('/cadastro-cliente')}
                  className={`mt-6 w-full py-3 rounded-lg font-semibold transition-all ${
                    item.popular 
                      ? 'bg-white text-[#F37021] hover:bg-gray-100' 
                      : 'bg-[#F37021] text-white hover:bg-[#D25C12]'
                  }`}
                >
                  Recarregar
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Reach Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-[#F37021] text-sm font-semibold uppercase tracking-wider">Cobertura Nacional</span>
              <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-6 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Envie para todo o Brasil
              </h2>
              <p className="text-gray-600 mb-8">
                Nossa plataforma oferece cobertura completa em todo território nacional, com múltiplas transportadoras e os melhores preços do mercado.
              </p>
              <ul className="space-y-4">
                {[
                  'Correios com até 80% de desconto',
                  'Transportadoras parceiras',
                  'Rastreamento em tempo real',
                  'Coleta no Brás-SP'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#F37021]" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
                <Globe className="w-48 h-48 text-[#F37021]/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 bg-[#F37021]">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Pronto para economizar?
            </h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Junte-se a milhares de lojistas que já economizam com a BRHUB Envios
            </p>
            <button 
              onClick={() => navigate('/cadastro-cliente')}
              className="group px-8 py-4 bg-white hover:bg-gray-100 rounded-lg text-lg font-semibold text-[#F37021] transition-all inline-flex items-center gap-3"
            >
              Criar conta gratuita
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={logoBrhub} alt="BRHUB ENVIOS" className="h-14 w-auto" />
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <button onClick={() => navigate('/apidocs')} className="hover:text-gray-900 transition-colors">
                API
              </button>
              <button onClick={() => navigate('/conecta')} className="hover:text-gray-900 transition-colors">
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
