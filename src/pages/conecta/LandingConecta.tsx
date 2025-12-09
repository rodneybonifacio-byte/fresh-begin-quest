import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Link2, 
  Users, 
  DollarSign, 
  BarChart3, 
  Gift, 
  CheckCircle2, 
  Star,
  Zap,
  MessageCircle,
  Wallet,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LandingConecta = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } }
  };

  const steps = [
    {
      icon: Link2,
      title: 'Cadastre-se gratuitamente',
      description: 'Crie sua conta, ative o Conecta+ e receba seu link exclusivo e código de indicação.'
    },
    {
      icon: Users,
      title: 'Indique novos clientes',
      description: 'Compartilhe seu link ou código nas redes sociais, WhatsApp, grupos de negócios e eventos.'
    },
    {
      icon: DollarSign,
      title: 'Ganhe comissão vitalícia',
      description: 'Cada vez que um cliente indicado emitir uma etiqueta, você recebe 10% do lucro líquido, para sempre.'
    },
    {
      icon: BarChart3,
      title: 'Acompanhe tudo em tempo real',
      description: 'No painel Conecta+ você vê seus clientes, consumo de fretes, comissões e histórico de ganhos.'
    }
  ];

  const audiences = [
    'Afiliados', 'Influenciadores', 'Lojistas', 'Profissionais do Brás', 
    'Consultores', 'Prestadores de serviço', 'Qualquer pessoa'
  ];

  const benefits = [
    { icon: TrendingUp, title: 'Comissão vitalícia', desc: 'Receba enquanto seu indicado estiver ativo no BRHUB.' },
    { icon: BarChart3, title: 'Renda recorrente', desc: 'Previsibilidade e crescimento de ganhos mês a mês.' },
    { icon: Gift, title: 'Materiais prontos', desc: 'Banners, mensagens de WhatsApp e artes para divulgação.' },
    { icon: Zap, title: 'Startup em expansão', desc: 'Participe desde o início de um programa com potencial nacional.' }
  ];

  const exclusiveBenefits = [
    { icon: BarChart3, text: 'Dashboard completo' },
    { icon: MessageCircle, text: 'Suporte da Veronica e do Will' },
    { icon: Gift, text: 'Promoções para parceiros' },
    { icon: Star, text: 'Comissão dobrada em campanhas "Conecta+ Week"' },
    { icon: Shield, text: 'Zero burocracia' },
    { icon: Wallet, text: 'Pagamento via PIX no dia 10 de cada mês' }
  ];

  const testimonials = [
    {
      quote: 'Ganhei mais de R$ 600 no meu primeiro mês apenas indicando lojistas do Brás.',
      author: 'Parceiro Jeferson M.'
    },
    {
      quote: 'Recomendar BRHUB Envios virou minha nova renda fixa.',
      author: 'Parceira Ana P.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg text-white">
              C+
            </div>
            <span className="text-xl font-bold text-gray-900">
              Conecta+
            </span>
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/home')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </button>
            <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900 transition-colors">
              BRHUB Envios
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/conecta/login')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/conecta/cadastro')}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Quero ser parceiro
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-100/40 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          className="container mx-auto max-w-5xl relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-sm font-medium">
              💼 Programa Oficial de Parcerias
            </span>
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center leading-tight mb-6 text-gray-900"
          >
            BRHUB{' '}
            <span className="text-orange-500">
              Conecta+
            </span>
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="text-xl sm:text-2xl text-gray-600 text-center max-w-3xl mx-auto mb-4"
          >
            Transforme suas indicações em renda recorrente
          </motion.p>

          <motion.p 
            variants={fadeInUp}
            className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-10"
          >
            O programa oficial de parcerias do BRHUB Envios que paga comissões{' '}
            <strong className="text-orange-500">vitalícias</strong> para quem indica novos clientes à plataforma.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex justify-center">
            <button 
              onClick={() => navigate('/conecta/cadastro')}
              className="group flex items-center gap-3 px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xl font-semibold transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
            >
              🔶 Quero ser parceiro Conecta+
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Como funciona</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm text-white">
                  {idx + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 mt-2">
                  <step.icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-2 text-lg text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who can participate */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Quem pode participar?</h2>
          </motion.div>

          <motion.div 
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {audiences.map((audience, idx) => (
              <span 
                key={idx}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {audience}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why it's worth it */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Por que vale a pena?</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, idx) => (
              <motion.div 
                key={idx}
                className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-2 text-lg text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-500">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Exclusive Benefits */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Benefícios exclusivos</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {exclusiveBenefits.map((item, idx) => (
              <motion.div 
                key={idx}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100"
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-gray-700">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Depoimentos</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {testimonials.map((item, idx) => (
              <motion.div 
                key={idx}
                className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{item.quote}"</p>
                <p className="text-sm text-orange-500 font-medium">— {item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                🔶 Quero ser parceiro Conecta+ agora mesmo!
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-lg mx-auto">
                Ganhe dinheiro indicando. Sem limite. Sem esforço. Sem investimento.
              </p>
              <button 
                onClick={() => navigate('/conecta/cadastro')}
                className="px-10 py-5 bg-white text-orange-600 hover:bg-gray-100 rounded-full text-xl font-semibold transition-all shadow-2xl"
              >
                Começar agora
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm text-white">
                C+
              </div>
              <span className="font-semibold text-gray-600">BRHUB Conecta+</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 BRHUB. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingConecta;
