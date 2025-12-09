import { motion } from 'framer-motion';
import { ArrowRight, Package, Users, Handshake, Zap, TrendingUp, Shield, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LandingHome = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg">
              BR
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              BRHUB
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition-colors">
              BRHUB Envios
            </button>
            <button onClick={() => navigate('/conecta')} className="text-gray-300 hover:text-white transition-colors">
              Conecta+
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/cadastro-cliente')}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          className="container mx-auto max-w-6xl relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
              <Zap className="w-4 h-4" />
              Plataforma líder em fretes do Brás
            </span>
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-center leading-tight mb-6"
          >
            Envie com até{' '}
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              80% de desconto
            </span>
            <br />
            no frete
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="text-lg sm:text-xl text-gray-400 text-center max-w-2xl mx-auto mb-10"
          >
            Sem mensalidades. Sem taxas escondidas. Comece a economizar hoje mesmo com a BRHUB Envios.
          </motion.p>

          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => navigate('/cadastro-cliente')}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full text-lg font-semibold transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
            >
              Começar agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/conecta')}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-lg font-medium transition-all"
            >
              <Handshake className="w-5 h-5 text-orange-400" />
              Programa de Parcerias
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={fadeInUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
          >
            {[
              { value: '50K+', label: 'Envios realizados' },
              { value: '80%', label: 'Economia média' },
              { value: '5K+', label: 'Clientes ativos' },
              { value: '99%', label: 'Satisfação' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Nossas Soluções</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Escolha a solução perfeita para seu negócio
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* BRHUB Envios Card */}
            <motion.div 
              className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 hover:border-orange-500/30 transition-all duration-500 overflow-hidden"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6">
                  <Package className="w-7 h-7" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3">BRHUB Envios</h3>
                <p className="text-gray-400 mb-6">
                  Plataforma completa para emissão de etiquetas com os melhores preços. Correios, transportadoras e muito mais.
                </p>

                <ul className="space-y-3 mb-8">
                  {['Até 80% de desconto', 'Sem mensalidades', 'Coleta no Brás', 'Painel completo'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 text-orange-400 font-medium group-hover:text-orange-300 transition-colors"
                >
                  Acessar plataforma
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Conecta+ Card */}
            <motion.div 
              className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 hover:border-purple-500/30 transition-all duration-500 overflow-hidden"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="absolute top-6 right-6">
                <span className="px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                  NOVO
                </span>
              </div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6">
                  <Handshake className="w-7 h-7" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3">BRHUB Conecta+</h3>
                <p className="text-gray-400 mb-6">
                  Programa de parcerias com comissões vitalícias. Indique clientes e ganhe 10% do lucro para sempre.
                </p>

                <ul className="space-y-3 mb-8">
                  {['Comissão vitalícia 10%', 'Painel exclusivo', 'Pagamento via PIX', 'Suporte dedicado'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => navigate('/conecta')}
                  className="flex items-center gap-2 text-purple-400 font-medium group-hover:text-purple-300 transition-colors"
                >
                  Seja um parceiro
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 bg-slate-900/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Por que escolher a BRHUB?</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, title: 'Economia Real', desc: 'Até 80% de desconto nos fretes' },
              { icon: Shield, title: 'Segurança', desc: 'Seus envios protegidos e rastreados' },
              { icon: Users, title: 'Suporte', desc: 'Atendimento humanizado e rápido' },
              { icon: Star, title: 'Qualidade', desc: 'Milhares de clientes satisfeitos' }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-orange-500/20 to-purple-500/10 border border-white/10 text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,146,60,0.15),transparent_50%)]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para economizar?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Junte-se a milhares de lojistas que já economizam com a BRHUB
              </p>
              <button 
                onClick={() => navigate('/cadastro-cliente')}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full text-lg font-semibold transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50"
              >
                Criar conta gratuita
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-white/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm">
                BR
              </div>
              <span className="font-semibold text-gray-400">BRHUB Envios</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 BRHUB. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHome;
