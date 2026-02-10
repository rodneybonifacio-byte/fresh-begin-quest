import { motion } from 'framer-motion';
import { ArrowRight, Package, Search, Globe, CheckCircle, Warehouse, Menu, X } from 'lucide-react';
import logoBrhub from '@/assets/logo-brhub-new.png';
import heroPort from '@/assets/hero-port.jpg';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
export const LandingHome = () => {
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleTrack = () => {
    if (trackingCode.trim()) {
      window.open(`/rastreio/encomenda?codigo=${trackingCode.trim()}`, '_blank');
    }
  };
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <div className="min-h-screen bg-white text-foreground overflow-hidden font-body">
      {/* Navbar - Dark */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img alt="BRHUB ENVIOS" className="h-12 w-auto" src="/lovable-uploads/63129796-efc6-4fd4-b9a1-15057e1abe21.png" />

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('services')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold font-display tracking-wide uppercase">
              Serviços
            </button>
            <button onClick={() => scrollTo('pricing')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold font-display tracking-wide uppercase">
              Preços
            </button>
            <button onClick={() => scrollTo('coverage')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold font-display tracking-wide uppercase">
              Cobertura
            </button>
            <button onClick={() => navigate('/conecta')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold font-display tracking-wide uppercase">
              Conecta+
            </button>
            <button onClick={() => navigate('/apidocs')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold font-display tracking-wide uppercase">
              API
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-5 py-2 text-sm font-bold font-display text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-all tracking-wide uppercase border border-gray-300">
              Login
            </button>
            <button onClick={() => navigate('/cadastro-cliente')} className="px-5 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold font-display text-primary-foreground transition-all tracking-wide">
              Criar Conta
            </button>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-black p-2">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="md:hidden bg-white border-t border-gray-200 px-4 pb-4">
            <div className="flex flex-col gap-3 py-3">
              <button onClick={() => scrollTo('services')} className="text-black/70 hover:text-black text-left py-2 text-sm font-medium uppercase">Serviços</button>
              <button onClick={() => scrollTo('pricing')} className="text-black/70 hover:text-black text-left py-2 text-sm font-medium uppercase">Preços</button>
              <button onClick={() => scrollTo('coverage')} className="text-black/70 hover:text-black text-left py-2 text-sm font-medium uppercase">Cobertura</button>
              <button onClick={() => navigate('/conecta')} className="text-black/70 hover:text-black text-left py-2 text-sm font-medium uppercase">Conecta+</button>
              <button onClick={() => navigate('/apidocs')} className="text-black/70 hover:text-black text-left py-2 text-sm font-medium uppercase">API</button>
              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <button onClick={() => navigate('/login')} className="flex-1 px-4 py-2.5 text-sm font-semibold text-black bg-gray-100 rounded-lg border border-gray-300 uppercase">Login</button>
                <button onClick={() => navigate('/cadastro-cliente')} className="flex-1 px-4 py-2.5 bg-primary rounded-lg text-sm font-semibold text-primary-foreground uppercase">Criar Conta</button>
              </div>
            </div>
          </motion.div>}
      </nav>

      {/* Hero Section - Full width image with tracking overlay */}
      <section className="relative pt-[60px]">
        <div className="relative h-[480px] sm:h-[520px] lg:h-[560px] overflow-hidden">
          <img src={heroPort} alt="Porto de logística BRHUB" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

          {/* Tracking Bar Overlay */}
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.3,
          duration: 0.6
        }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-primary" />
                <span className="font-black font-display text-foreground text-lg tracking-tight">Rastreie sua encomenda</span>
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Ex: AB123456789BR" value={trackingCode} onChange={e => setTrackingCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleTrack()} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                <button onClick={handleTrack} className="px-8 py-3 bg-primary hover:bg-primary/90 rounded-xl font-black font-display text-primary-foreground transition-all shadow-lg shadow-primary/30 tracking-wide">
                  Rastrear
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <h2 className="text-3xl sm:text-4xl font-black font-display text-foreground mb-3 tracking-tight">
              Nossos Serviços
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-body">
              Automatize sua logística com tecnologia B2B minimalista e eficiente.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[{
            icon: Package,
            title: 'Envio B2B',
            desc: 'Emissão de etiquetas com até 80% de desconto. Correios e transportadoras integrados.'
          }, {
            icon: Warehouse,
            title: 'Logística Integrada',
            desc: 'Gestão completa de envios, coletas agendadas e rastreamento em tempo real.'
          }, {
            icon: Globe,
            title: 'Cobertura Nacional',
            desc: 'Envie para qualquer lugar do Brasil com múltiplas transportadoras parceiras.'
          }].map((item, idx) => <motion.div key={idx} className="group p-8 rounded-2xl bg-white border-2 border-gray-100 hover:border-primary transition-all duration-300 hover:shadow-xl" initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: idx * 0.15
          }}>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary flex items-center justify-center mb-6 transition-colors duration-300">
                  <item.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-bold font-display text-xl mb-3 text-foreground tracking-tight">{item.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed font-body">{item.desc}</p>
                <button onClick={() => navigate('/cadastro-cliente')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold font-display text-primary-foreground transition-all tracking-wide">
                  Começar agora
                </button>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <h2 className="text-3xl sm:text-4xl font-black font-display text-foreground mb-3 tracking-tight">
              Créditos para Enviar
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-body">
              Recarregue seus créditos e comece a economizar imediatamente.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[{
            value: 'R$ 50',
            label: 'Início',
            desc: 'Comece seu negócio',
            bonus: '',
            popular: false
          }, {
            value: 'R$ 100',
            label: 'Médio',
            desc: 'Escale seus envios',
            bonus: '+5% bônus',
            popular: true
          }, {
            value: 'R$ 200',
            label: 'Pro',
            desc: 'Volume profissional',
            bonus: '+10% bônus',
            popular: false
          }].map((item, idx) => <motion.div key={idx} className={`relative p-8 rounded-2xl text-center transition-all ${item.popular ? 'bg-[#121212] text-white shadow-2xl scale-105 border-2 border-primary' : 'bg-white border-2 border-gray-100 hover:border-primary'}`} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: idx * 0.1
          }}>
                {item.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    POPULAR
                  </div>}
                <h3 className={`font-bold font-display text-lg mb-1 tracking-tight ${item.popular ? 'text-white' : 'text-foreground'}`}>
                  {item.label}
                </h3>
                <p className={`text-sm mb-4 font-body ${item.popular ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {item.desc}
                </p>
                <div className={`text-4xl font-black font-display mb-1 tracking-tight ${item.popular ? 'text-white' : 'text-foreground'}`}>
                  {item.value}
                </div>
                {item.bonus && <div className="text-sm font-medium text-primary mb-4">{item.bonus}</div>}
                {!item.bonus && <div className="mb-4" />}
                <button onClick={() => navigate('/cadastro-cliente')} className={`w-full py-3 rounded-xl font-semibold transition-all ${item.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                  Recarregar
                </button>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Global Reach / Coverage Section */}
      <section id="coverage" className="py-20 px-4 sm:px-6 bg-[#121212] text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }}>
              <h2 className="text-3xl sm:text-4xl font-black font-display mb-6 tracking-tight">
                Cobertura <span className="text-primary">Nacional</span>
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed font-body">
                Nossa plataforma oferece cobertura completa em todo território nacional, com múltiplas transportadoras e os melhores preços do mercado.
              </p>
              <ul className="space-y-4 mb-8">
                {['Correios com até 80% de desconto', 'Transportadoras parceiras (Rodonaves e mais)', 'Rastreamento em tempo real', 'Coleta agendada no Brás-SP'].map((item, idx) => <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-white/80">{item}</span>
                  </li>)}
              </ul>
              <button onClick={() => navigate('/cadastro-cliente')} className="inline-flex items-center gap-3 px-7 py-3.5 bg-primary hover:bg-primary/90 rounded-xl font-semibold text-primary-foreground transition-all shadow-lg shadow-primary/30">
                Começar agora
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>

            <motion.div className="relative" initial={{
            opacity: 0,
            x: 30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }}>
              <div className="flex items-center justify-center min-h-[320px]">
                {/* Dotted world map style */}
                <div className="relative w-full max-w-md">
                  <Globe className="w-full h-auto text-white/10" strokeWidth={0.5} />
                  {/* Orange dots representing coverage */}
                  <div className="absolute top-[45%] left-[30%] w-3 h-3 bg-primary rounded-full animate-pulse" />
                  <div className="absolute top-[50%] left-[35%] w-2 h-2 bg-primary rounded-full animate-pulse" style={{
                  animationDelay: '0.5s'
                }} />
                  <div className="absolute top-[55%] left-[28%] w-2.5 h-2.5 bg-primary rounded-full animate-pulse" style={{
                  animationDelay: '1s'
                }} />
                  <div className="absolute top-[48%] left-[32%] w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{
                  animationDelay: '1.5s'
                }} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 bg-primary">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }}>
            <h2 className="text-3xl sm:text-4xl font-black font-display mb-4 text-primary-foreground tracking-tight">
              Pronto para economizar?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto font-body">
              Junte-se a milhares de lojistas que já economizam com a BRHUB Envios.
            </p>
            <button onClick={() => navigate('/cadastro-cliente')} className="group px-8 py-4 bg-[#121212] hover:bg-[#1a1a1a] rounded-xl text-lg font-black font-display text-white transition-all inline-flex items-center gap-3 shadow-xl tracking-wide">
              Criar conta gratuita
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 bg-[#121212] text-white border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={logoBrhub} alt="BRHUB ENVIOS" className="h-12 w-auto" />
            <div className="flex items-center gap-6 text-sm text-white/50">
              <button onClick={() => navigate('/apidocs')} className="hover:text-white transition-colors">API</button>
              <button onClick={() => navigate('/conecta')} className="hover:text-white transition-colors">Conecta+</button>
              <button onClick={() => navigate('/widget-docs')} className="hover:text-white transition-colors">Widget</button>
              <span>© 2025 BRHUB. Todos os direitos reservados.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingHome;