import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Package, Truck, BarChart3, Shield, Zap, Globe, Bot, MessageSquare,
  Bell, CreditCard, FileText, Cpu, CheckCircle2, Gem,
  MapPin, TrendingUp, Users, Headphones, Smartphone, Mail,
  Send, ChevronDown, Layers, Activity, Server, Database, RefreshCw,
  Star, Award, Target, Rocket, Settings, Flag
} from 'lucide-react';
import lookChinaLogo from '@/assets/look-china-logo.png';
import arquiteturaImg from '@/assets/arquitetura-look-envios.jpg';

// ─── Animated counter ────────────────────────────────────────────
const Counter = ({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);
  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}{suffix}</span>;
};

// ─── Animated architecture node ──────────────────────────────────
const ArchNode = ({ icon: Icon, label, delay, color }: { icon: any; label: string; delay: number; color: string }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    whileInView={{ scale: 1, opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay, type: 'spring', stiffness: 200 }}
    className="flex flex-col items-center gap-2"
  >
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2 + delay, repeat: Infinity, ease: 'easeInOut' }}
      className="w-14 h-14 md:w-18 md:h-18 rounded-2xl flex items-center justify-center shadow-lg"
      style={{ backgroundColor: color }}
    >
      <Icon className="w-7 h-7 md:w-9 md:h-9 text-white" />
    </motion.div>
    <span className="text-xs md:text-sm font-semibold text-gray-700 text-center max-w-[80px]">{label}</span>
  </motion.div>
);

// ─── Flowing data line ───────────────────────────────────────────
const FlowLine = ({ direction = 'right' }: { direction?: 'right' | 'down' }) => (
  <div className={`relative ${direction === 'right' ? 'w-8 md:w-16 h-1' : 'w-1 h-8 md:h-16'} bg-gray-200 rounded-full overflow-hidden`}>
    <motion.div
      className={`absolute ${direction === 'right' ? 'h-full w-4' : 'w-full h-4'} rounded-full`}
      style={{ background: 'linear-gradient(90deg, #EA580C, #F97316)' }}
      animate={direction === 'right' ? { x: ['-100%', '500%'] } : { y: ['-100%', '500%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

// ─── Pulse dot ───────────────────────────────────────────────────
const PulseDot = ({ color = '#EA580C' }: { color?: string }) => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: color }} />
  </span>
);

// ─── Section wrapper ─────────────────────────────────────────────
const Section = ({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={`py-16 md:py-24 ${className}`}>
    <div className="max-w-6xl mx-auto px-6">{children}</div>
  </section>
);

const SectionTitle = ({ badge, badgeIcon: BadgeIcon, title, highlight, subtitle }: { badge?: string; badgeIcon?: any; title: string; highlight: string; subtitle: string }) => (
  <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
    {badge && (
      <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
        {BadgeIcon && <BadgeIcon className="w-4 h-4" />} {badge}
      </div>
    )}
    <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">{title} <span className="text-orange-600">{highlight}</span></h2>
    <p className="text-gray-500 text-lg max-w-2xl mx-auto">{subtitle}</p>
  </motion.div>
);

// ─── Tabela Diamante (Correios) ──────────────────────────────────
const tabelaDiamanteData = [
  { faixa: 'Até 100g', sp: 'R$ 6,90', sudeste: 'R$ 9,79', sul: 'R$ 9,42', nordeste: 'R$ 13,27', norte: 'R$ 14,86' },
  { faixa: 'Até 500g', sp: 'R$ 7,55', sudeste: 'R$ 11,39', sul: 'R$ 11,00', nordeste: 'R$ 15,22', norte: 'R$ 17,63' },
  { faixa: 'Até 1kg', sp: 'R$ 7,98', sudeste: 'R$ 15,00', sul: 'R$ 14,20', nordeste: 'R$ 21,20', norte: 'R$ 21,39' },
  { faixa: 'Até 2kg', sp: 'R$ 9,31', sudeste: 'R$ 17,55', sul: 'R$ 16,41', nordeste: 'R$ 26,48', norte: 'R$ 27,97' },
  { faixa: 'Até 5kg', sp: 'R$ 14,28', sudeste: 'R$ 25,39', sul: 'R$ 23,17', nordeste: 'R$ 46,78', norte: 'R$ 49,25' },
  { faixa: 'Até 10kg', sp: 'R$ 20,35', sudeste: 'R$ 38,15', sul: 'R$ 34,18', nordeste: 'R$ 80,55', norte: 'R$ 90,59' },
  { faixa: 'Até 20kg', sp: 'R$ 37,78', sudeste: 'R$ 63,52', sul: 'R$ 58,40', nordeste: 'R$ 152,11', norte: 'R$ 170,42' },
  { faixa: 'Até 30kg', sp: 'R$ 57,04', sudeste: 'R$ 93,16', sul: 'R$ 86,50', nordeste: 'R$ 242,85', norte: 'R$ 297,00' },
];

// ─── Tabela Documentos/Cartões ───────────────────────────────────
const tabelaDocumentos = [
  { peso: 'Até 100g', local: 'R$ 5,90', estadual: 'R$ 8,10', r1: 'R$ 8,94', r3: 'R$ 10,35', r4: 'R$ 11,19' },
  { peso: 'Até 250g', local: 'R$ 8,65', estadual: 'R$ 9,41', r1: 'R$ 11,29', r3: 'R$ 14,37', r4: 'R$ 16,21' },
  { peso: 'Até 300g', local: 'R$ 8,99', estadual: 'R$ 9,84', r1: 'R$ 12,07', r3: 'R$ 15,70', r4: 'R$ 17,87' },
  { peso: 'Até 500g', local: 'R$ 10,32', estadual: 'R$ 11,58', r1: 'R$ 15,22', r3: 'R$ 21,05', r4: 'R$ 24,57' },
];

// ─── Tabela E-commerce Capitais ──────────────────────────────────
const tabelaEcommerce = [
  { uf: 'SP', destino: 'São Paulo', ate100: 'R$ 11,20*', ate500: 'R$ 13,50*', ate1kg: 'R$ 17,80*', ate2kg: 'R$ 22,50*' },
  { uf: 'BA', destino: 'Salvador', ate100: 'R$ 14,11', ate500: 'R$ 15,43', ate1kg: 'R$ 21,61', ate2kg: 'R$ 27,08' },
  { uf: 'AM', destino: 'Manaus', ate100: 'R$ 18,69', ate500: 'R$ 24,50', ate1kg: 'R$ 29,51', ate2kg: 'R$ 36,16' },
  { uf: 'AC', destino: 'Rio Branco', ate100: 'R$ 20,48', ate500: 'R$ 25,29', ate1kg: 'R$ 38,63', ate2kg: 'R$ 56,57' },
];

// ─── Main Component ──────────────────────────────────────────────
const LookEnviosPage = () => {
  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 h-1 z-50" style={{ width: progressWidth, background: 'linear-gradient(90deg, #EA580C, #F97316)' }} />

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full border border-white/10" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} className="absolute -bottom-60 -left-60 w-[800px] h-[800px] rounded-full border border-white/5" />
        
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} className="absolute" style={{ left: `${10 + i * 11}%`, top: `${15 + (i % 4) * 20}%` }}
            animate={{ y: [0, -25, 0], opacity: [0.08, 0.25, 0.08] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.2 }}>
            <Package className="w-6 h-6 md:w-8 md:h-8 text-white/20" />
          </motion.div>
        ))}

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.img src={lookChinaLogo} alt="Look China" className="h-20 md:h-28 mx-auto mb-8 drop-shadow-2xl"
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} />
          <motion.h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tight"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            LOOK <span className="text-orange-200">ENVIOS</span>
          </motion.h1>
          <motion.p className="text-base md:text-xl text-orange-200 font-semibold mb-2"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            Ecossistema Logístico de Nova Geração
          </motion.p>
          <motion.p className="text-sm md:text-lg text-orange-100/80 max-w-3xl mx-auto mb-8"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            Tecnologia Look China | Inteligência Financeira BRHUB | Atendimento com IA 24/7
          </motion.p>
          <motion.p className="text-sm md:text-base text-orange-100/70 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
            Esta proposta consolida o Look Envios como a solução logística mais completa e tecnologicamente avançada do mercado, integrando transporte, gestão financeira automatizada e uma camada inteligente de suporte ao cliente.
          </motion.p>

          <motion.div className="flex flex-wrap justify-center gap-3 mb-10"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
            {['Correios Diamante', 'JadLog', 'Flex Envios', 'BusLog'].map((t, i) => (
              <span key={i} className="bg-white/15 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-semibold border border-white/20">{t}</span>
            ))}
          </motion.div>

          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
            {[
              { value: 320, suffix: 'k', label: 'Envios/Mês' },
              { value: 8, prefix: 'R$ ', suffix: 'M', label: 'Volume Mensal' },
              { value: 5570, label: 'Cidades Atendidas' },
              { value: 99, suffix: '%', label: 'Uptime' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
                <div className="text-2xl md:text-3xl font-black text-white"><Counter end={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix} /></div>
                <div className="text-orange-200 text-sm font-medium">{kpi.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="mt-12" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown className="w-8 h-8 text-white/50 mx-auto" />
          </motion.div>
        </div>
      </section>

      {/* ═══════ 1. ECOSSISTEMA — TRANSPORTADORAS ═══════ */}
      <Section className="bg-gray-50" id="ecossistema">
        <SectionTitle badge="Seção 1" badgeIcon={Globe} title="O Ecossistema LOOK Envios:" highlight="Conectividade e Escalabilidade" subtitle="O Look Envios é o centro de comando para sua operação de e-commerce. Nossa plataforma atua como um agregador inteligente, eliminando a burocracia e fornecendo acesso imediato às maiores transportadoras do país." />

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Package, name: 'Correios', desc: 'Cobertura nacional total para PAC e SEDEX com Tabela Diamante exclusiva.', color: '#EA580C', tag: 'Diamante' },
            { icon: Truck, name: 'JadLog', desc: 'Malha privada de alta eficiência para prazos curtos e e-commerce.', color: '#C2410C', tag: 'Express' },
            { icon: Zap, name: 'Flex Envios', desc: 'Otimização para entregas no mesmo dia ou no dia seguinte (Last Mile).', color: '#9A3412', tag: 'Same Day' },
            { icon: Globe, name: 'BusLog', desc: 'Soluções rodoviárias estratégicas para grandes volumes e distâncias.', color: '#7C2D12', tag: 'Rodoviário' },
          ].map((t, i) => (
            <motion.div key={i} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              whileHover={{ y: -8, scale: 1.02 }} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl" style={{ backgroundColor: t.color }}>{t.tag}</div>
              <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${t.color}15` }}
                animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}>
                <t.icon className="w-7 h-7" style={{ color: t.color }} />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ═══════ ARQUITETURA LOOK CHINA (IMAGEM + ANIMADA) ═══════ */}
      <Section className="bg-white" id="arquitetura">
        <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <PulseDot /> Operação em Tempo Real
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Arquitetura <span className="text-orange-600">Look China</span></h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Baseada na infraestrutura de alta disponibilidade da Look China, nossa plataforma garante estabilidade absoluta para emissões em massa e rastreamento em tempo real.</p>
        </motion.div>

        {/* Imagem original da arquitetura do PDF */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
          className="mb-16 rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
          <img src={arquiteturaImg} alt="Arquitetura Técnica do Hub de Logística Look Envios" className="w-full" />
        </motion.div>

        {/* Versão animada da arquitetura */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 md:gap-5 flex-wrap justify-center">
            <ArchNode icon={Smartphone} label="App Look China" delay={0} color="#EA580C" />
            <FlowLine />
            <ArchNode icon={Globe} label="Marketplace" delay={0.1} color="#F97316" />
            <FlowLine />
            <ArchNode icon={Cpu} label="API REST" delay={0.2} color="#FB923C" />
            <FlowLine />
            <ArchNode icon={MessageSquare} label="WhatsApp" delay={0.3} color="#FDBA74" />
          </div>
          <FlowLine direction="down" />

          {/* Core platform */}
          <motion.div className="relative w-full max-w-2xl" initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
            <div className="rounded-3xl p-8 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}>
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} className="absolute h-px bg-white/20" style={{ top: `${20 + i * 15}%`, left: 0, right: 0 }}
                  animate={{ opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
              ))}
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Activity className="w-6 h-6 text-white" />
                  <h3 className="text-2xl md:text-3xl font-black text-white">LOOK ENVIOS</h3>
                  <PulseDot color="#fff" />
                </div>
                <p className="text-orange-100 text-sm">Motor de Cotação • Emissão de Etiquetas • Rastreamento • IA • Split Financeiro</p>
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                  {['Cotando...', 'Emitindo...', 'Rastreando...', 'Notificando...'].map((t, i) => (
                    <motion.div key={i} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"
                      animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}>
                      <RefreshCw className="w-3 h-3 text-white animate-spin" style={{ animationDuration: `${3 + i}s` }} />
                      <span className="text-xs text-white font-medium">{t}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <FlowLine direction="down" />

          <div className="flex items-center gap-2 md:gap-5 flex-wrap justify-center">
            <ArchNode icon={FileText} label="Etiquetas" delay={0.5} color="#16A34A" />
            <FlowLine />
            <ArchNode icon={MapPin} label="Rastreio" delay={0.6} color="#2563EB" />
            <FlowLine />
            <ArchNode icon={Bell} label="Notificações" delay={0.7} color="#7C3AED" />
            <FlowLine />
            <ArchNode icon={CreditCard} label="Split Financeiro" delay={0.8} color="#DB2777" />
          </div>
        </div>
      </Section>

      {/* ═══════ 2. BRANDING ═══════ */}
      <Section className="bg-gray-50" id="branding">
        <SectionTitle badge="Seção 2" badgeIcon={Star} title="Branding de Alto Impacto:" highlight="Sua Marca em Cada Pacote" subtitle="No LOOK Envios, a entrega é o momento da verdade. Elevamos o profissionalismo da sua operação." />

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" /> Etiquetas Personalizadas</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Todas as etiquetas de postagem geradas carregam a logomarca LOOK Envios. Isso cria uma percepção de marca corporativa sólida e confiável em cada encomenda recebida pelo cliente.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"><Layers className="w-5 h-5 text-orange-500" /> Interface Unificada</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Painéis de controle intuitivos com a identidade visual vibrante (Laranja e Branco) reforçando a segurança e modernidade do serviço.</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border border-orange-200">
              <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EA580C' }}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Etiqueta #LK20260318</div>
                    <div className="text-xs text-gray-500">PAC • Look Envios</div>
                  </div>
                  <PulseDot />
                </div>
                {['Objeto Postado', 'Em Trânsito', 'Saiu para Entrega', 'Entregue'].map((s, i) => (
                  <motion.div key={i} className="flex items-center gap-3"
                    animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}>
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: i === 1 ? '#EA580C' : '#D1D5DB' }} />
                    <span className={`text-sm ${i === 1 ? 'font-semibold' : ''}`} style={{ color: i === 1 ? '#EA580C' : '#9CA3AF' }}>{s}</span>
                    {i === 1 && <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}><Truck className="w-4 h-4" style={{ color: '#EA580C' }} /></motion.div>}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══════ 3. IA & ATENDIMENTO ═══════ */}
      <section id="ia" className="py-16 md:py-24" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Bot className="w-4 h-4" /> Seção 3 — Powered by BRHUB Conecta
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Atendimento Inteligente e <span className="text-orange-200">Suporte com IA</span></h2>
            <p className="text-orange-100 text-lg max-w-2xl mx-auto">Nossa solução vai além da logística básica, oferecendo uma camada de serviços de suporte que reduz drasticamente o volume de tickets manuais e aumenta a satisfação do cliente.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              { icon: Bot, title: 'Assistentes de IA (24/7)', desc: 'IA treinada para responder dúvidas frequentes sobre prazos, status de entrega e procedimentos de troca, funcionando 24 horas por dia.' },
              { icon: Activity, title: 'Triagem Inteligente', desc: 'A IA realiza a triagem inicial das solicitações, resolvendo problemas simples e escalando casos complexos para o atendimento humanizado de forma organizada.' },
              { icon: MessageSquare, title: 'Automação de Respostas', desc: 'Utilização de IA treinada para responder dúvidas frequentes sobre prazos, status de entrega e procedimentos de troca automaticamente.' },
              { icon: Bell, title: 'Rastreamento via WhatsApp/E-mail', desc: 'O sistema envia alertas automáticos para o cliente em cada etapa da jornada (Objeto Postado, Em Trânsito, Saiu para Entrega, Entregue).' },
              { icon: Shield, title: 'Alertas de Exceção', desc: 'Identificamos atrasos ou problemas na entrega antes mesmo do cliente e enviamos uma notificação proativa, reduzindo a ansiedade e aumentando a transparência.' },
              { icon: Headphones, title: 'Gestão de Protocolos', desc: 'Centralizamos todos os canais de atendimento em uma interface única, garantindo agilidade e controle total sobre as demandas.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
                whileHover={{ y: -6 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/15">
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}>
                  <item.icon className="w-10 h-10 text-white mb-4" />
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-orange-100 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 4. INTELIGÊNCIA FINANCEIRA ═══════ */}
      <Section className="bg-white" id="financeiro">
        <SectionTitle badge="Seção 4" badgeIcon={CreditCard} title="Inteligência Financeira e" highlight="Gestão de Fluxo de Caixa" subtitle="Através da integração com a BRHUB, o LOOK Envios resolve o maior desafio do lojista: a conciliação financeira de frete." />

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
            <CreditCard className="w-10 h-10 mb-4" style={{ color: '#EA580C' }} />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Split de Pagamento Automatizado</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> <span><strong>Repasse Direto:</strong> O componente financeiro referente ao frete é automaticamente segregado no ato da venda e direcionado para a conta BRHUB.</span></li>
              <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> <span><strong>Liquidez Operacional:</strong> Garante que os recursos para logística estejam sempre disponíveis desonerando o capital de giro principal do negócio.</span></li>
            </ul>
          </motion.div>
          <motion.div initial={{ x: 30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
            <FileText className="w-10 h-10 mb-4" style={{ color: '#EA580C' }} />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Política de Faturamento (Faturas)</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> <span><strong>Vendas Externas (WhatsApp/Digital):</strong> Para emissões de vendas realizadas fora de marketplaces, o sistema emite faturas detalhadas, permitindo a gestão de crédito e fluxo de caixa de forma profissional.</span></li>
              <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> <span><strong>Integração Marketplace:</strong> Para vendas onde o marketplace já retém o frete, o sistema atua apenas como emissor e rastreador, sem bitributação ou cobranças duplicadas.</span></li>
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* ═══════ 5. ESPECIFICAÇÕES TÉCNICAS ═══════ */}
      <Section className="bg-gray-50" id="tecnico">
        <SectionTitle badge="Seção 5" badgeIcon={Cpu} title="Especificações Técnicas" highlight="para Engenharia" subtitle="Stack tecnológica robusta para integração e escalabilidade" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Server, label: 'API RESTful', desc: 'Integração via JSON com documentação completa em Swagger' },
            { icon: Zap, label: 'Webhooks Dinâmicos', desc: 'Notificações em tempo real sobre status logísticos e split financeiro' },
            { icon: FileText, label: 'Formatos de Etiqueta', desc: 'Suporte nativo para PDF e ZPL (térmica) com branding unificado' },
            { icon: Shield, label: 'Segurança', desc: 'Protocolos OAuth2 e criptografia de dados em trânsito' },
            { icon: Database, label: 'Integrações', desc: 'Shopify, Nuvemshop, Tiny, WooCommerce e mais' },
            { icon: Activity, label: 'SLA 99.9%', desc: 'Alta disponibilidade com infraestrutura Look China' },
            { icon: Cpu, label: 'Emissão em Massa', desc: 'Processamento paralelo de milhares de etiquetas via CSV/XLSX' },
            { icon: RefreshCw, label: 'Ambientes', desc: 'Staging + Produção com deploy automatizado' },
          ].map((spec, i) => (
            <motion.div key={i} initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF7ED' }}>
                <spec.icon className="w-5 h-5" style={{ color: '#EA580C' }} />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{spec.label}</div>
                <div className="text-gray-500 text-xs">{spec.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ═══════ 6. TARIFAS — TABELA DIAMANTE CORREIOS ═══════ */}
      <section id="tarifas" className="py-16 md:py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
        <motion.div className="absolute top-10 right-10 text-orange-500/10"
          animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
          <Gem className="w-60 h-60" />
        </motion.div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: 'rgba(234,88,12,0.2)', color: '#FB923C' }}>
              <Gem className="w-4 h-4" /> Seção 6 — Exclusivo Look Envios
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Tabela <span style={{ background: 'linear-gradient(90deg, #F97316, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diamante</span> Correios
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Os melhores preços do mercado com contrato exclusivo — até 70% mais barato que a tabela balcão</p>
          </motion.div>

          {/* Tabela PAC Capitais */}
          <motion.div initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
            className="rounded-2xl border overflow-hidden mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="text-white font-bold flex items-center gap-2"><Package className="w-4 h-4 text-orange-400" /> PAC — Capitais (Contrato Diamante)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #EA580C, #F97316)' }}>
                    <th className="px-4 py-3 text-left text-white font-bold">Faixa de Peso</th>
                    <th className="px-4 py-3 text-center text-white font-bold">SP Capital</th>
                    <th className="px-4 py-3 text-center text-white font-bold">Sudeste</th>
                    <th className="px-4 py-3 text-center text-white font-bold">Sul</th>
                    <th className="px-4 py-3 text-center text-white font-bold">Nordeste</th>
                    <th className="px-4 py-3 text-center text-white font-bold">Norte</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaDiamanteData.map((row, i) => (
                    <motion.tr key={i} initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className="border-b hover:bg-orange-500/10 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#FDBA74' }}>{row.faixa}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: '#4ADE80' }}>{row.sp}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.sudeste}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.sul}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.nordeste}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.norte}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'linear-gradient(90deg, rgba(234,88,12,0.2), transparent)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#FDBA74' }}>
                <Star className="w-4 h-4" />
                <span className="font-semibold">Valores referentes a PAC Capitais — Contrato Diamante exclusivo para parceiros Look Envios</span>
              </div>
            </div>
          </motion.div>

          {/* Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { label: 'SP Capital', value: 'R$ 6,90', desc: 'A partir de — PAC até 100g', icon: Target },
              { label: 'Economia', value: 'Até 70%', desc: 'vs. Tabela Balcão Correios', icon: TrendingUp },
              { label: 'Cobertura', value: '100%', desc: 'Nacional — todos os CEPs', icon: Globe },
            ].map((card, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }}
                className="rounded-2xl p-6 border" style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.2), rgba(234,88,12,0.1))', borderColor: 'rgba(234,88,12,0.2)' }}>
                <card.icon className="w-8 h-8 mb-3" style={{ color: '#FB923C' }} />
                <div className="text-3xl font-black text-white mb-1">{card.value}</div>
                <div className="font-semibold text-sm" style={{ color: '#FDBA74' }}>{card.label}</div>
                <div className="text-gray-500 text-xs mt-1">{card.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* 6.1 Tarifas Documentos */}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" style={{ color: '#FB923C' }} /> 6.1 Tarifas para Documentos e Cartões (Nacional)</h3>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(234,88,12,0.3)' }}>
                      <th className="px-4 py-2.5 text-left text-white font-bold">Peso</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Local</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Estadual</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Sul/Sudeste (R1)</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Nordeste (R3)</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Norte (R4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaDocumentos.map((row, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: '#FDBA74' }}>{row.peso}</td>
                        <td className="px-4 py-2.5 text-center font-bold" style={{ color: '#4ADE80' }}>{row.local}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.estadual}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.r1}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.r3}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.r4}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* 6.2 Amostra E-commerce Capitais */}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Package className="w-5 h-5" style={{ color: '#FB923C' }} /> 6.2 Amostra de Tarifas E-commerce para Capitais</h3>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(234,88,12,0.3)' }}>
                      <th className="px-4 py-2.5 text-left text-white font-bold">UF</th>
                      <th className="px-4 py-2.5 text-left text-white font-bold">Destino</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Até 100g</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Até 500g</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Até 1kg</th>
                      <th className="px-4 py-2.5 text-center text-white font-bold">Até 2kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaEcommerce.map((row, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#FB923C' }}>{row.uf}</td>
                        <td className="px-4 py-2.5 text-gray-300">{row.destino}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.ate100}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.ate500}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.ate1kg}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{row.ate2kg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-2 text-xs text-gray-500 italic border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                *Valores médios para regiões metropolitanas.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FUNCIONALIDADES DA PLATAFORMA ═══════ */}
      <Section className="bg-white" id="funcionalidades">
        <SectionTitle badge="Plataforma BRHUB" badgeIcon={Layers} title="Funcionalidades da" highlight="Plataforma" subtitle="Tudo que você precisa para gerenciar sua logística em um só lugar — funcionalidades reais e operacionais" />

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Package, title: 'Emissão de Etiquetas', desc: 'Emissão individual ou em massa via planilha CSV/XLSX. Etiquetas com branding Look Envios em PDF ou ZPL (térmica).', color: '#EA580C' },
            { icon: BarChart3, title: 'Simulador de Frete', desc: 'Compare preços entre Correios, JadLog, Flex e BusLog em tempo real. Multi-remetentes e multi-volumes.', color: '#2563EB' },
            { icon: MapPin, title: 'Rastreamento com Mapa', desc: 'Rastreio em tempo real com mapa interativo Leaflet. Alertas proativos de atrasos e rotas animadas.', color: '#16A34A' },
            { icon: Bot, title: 'CRM com IA WhatsApp', desc: 'CRM completo com múltiplos canais WhatsApp, assistentes de IA, triagem inteligente e pipeline de suporte.', color: '#7C3AED' },
            { icon: Bell, title: 'Notificações Automáticas', desc: 'Templates HSM WhatsApp em cada etapa: Postado, Em Trânsito, Saiu para Entrega, Entregue, Aguardando Retirada.', color: '#059669' },
            { icon: CreditCard, title: 'Recarga PIX', desc: 'Sistema de créditos com recarga via PIX (QR Code), confirmação instantânea e extrato detalhado.', color: '#DB2777' },
            { icon: FileText, title: 'Gestão de Faturas', desc: 'Faturas detalhadas com PDF, boletos e controle de pagamento. Split automático de valores.', color: '#D97706' },
            { icon: Users, title: 'Multi-Remetentes', desc: 'Gerencie múltiplos remetentes e endereços de origem com sincronização automática.', color: '#6366F1' },
            { icon: BarChart3, title: 'Relatórios de Desempenho', desc: 'Dashboard com KPIs: no prazo, atrasados, em trânsito. Análise por UF, serviço e remetente com gráficos.', color: '#0891B2' },
            { icon: Globe, title: 'Integrações E-commerce', desc: 'Shopify, Nuvemshop, Tiny ERP com importação automática de pedidos e envio de rastreio.', color: '#8B5CF6' },
            { icon: Shield, title: 'Segurança & Auditoria', desc: 'Criptografia de dados, RLS em banco, auditoria de acessos e logs detalhados.', color: '#DC2626' },
            { icon: Headphones, title: 'Programa Conecta+', desc: 'Programa de parceiros com comissão de 20% sobre lucro líquido, dashboard e simulador de ganhos.', color: '#F43F5E' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
              whileHover={{ y: -4 }} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}12` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ═══════ 7. ROADMAP ═══════ */}
      <Section className="bg-gray-50" id="roadmap">
        <SectionTitle badge="Seção 7" badgeIcon={Rocket} title="Cronograma de" highlight="Entrega" subtitle="Plano de implementação em 4 fases para ativação completa do Look Envios" />

        <div className="max-w-3xl mx-auto">
          {[
            { fase: 'Fase 1', title: 'Ativação e Configuração', desc: 'Ativação da conta BRHUB e configuração do Gateway de Pagamento/Split.', icon: Settings, color: '#EA580C' },
            { fase: 'Fase 2', title: 'Treinamento da IA', desc: 'Treinamento da IA de Atendimento com base no seu histórico de SAC.', icon: Bot, color: '#F97316' },
            { fase: 'Fase 3', title: 'Integração e Testes', desc: 'Integração da API LOOK Envios e teste de notificações multicanal.', icon: Cpu, color: '#FB923C' },
            { fase: 'Fase 4', title: 'Lançamento Oficial', desc: 'Go-Live — Lançamento oficial da plataforma Look Envios.', icon: Flag, color: '#16A34A' },
          ].map((step, i) => (
            <motion.div key={i} initial={{ x: i % 2 === 0 ? -40 : 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="flex items-start gap-6 mb-8 last:mb-0">
              <div className="flex flex-col items-center">
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: step.color }}
                  animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                  <step.icon className="w-7 h-7 text-white" />
                </motion.div>
                {i < 3 && <div className="w-0.5 h-12 bg-gray-200 mt-2" />}
              </div>
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: step.color }}>{step.fase}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{step.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="py-16 md:py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)' }}>
        <motion.div className="absolute inset-0"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)', backgroundSize: '200% 200%' }} />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <Award className="w-16 h-16 text-orange-200 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Conectando o Brasil com Inteligência e Agilidade</h2>
            <p className="text-orange-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              O Look Envios combina a tecnologia Look China com a inteligência financeira BRHUB para criar o ecossistema logístico mais completo e acessível do mercado.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a href="https://wa.me/5511999999999?text=Quero%20saber%20mais%20sobre%20o%20Look%20Envios" target="_blank"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-shadow" style={{ color: '#EA580C' }}>
                <Send className="w-5 h-5" /> Falar com Consultor
              </motion.a>
              <motion.a href="mailto:contato@lookenvios.com.br"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-colors">
                <Mail className="w-5 h-5" /> Enviar E-mail
              </motion.a>
            </div>
            <p className="text-orange-200/60 text-sm mt-8">www.lookenvios.com.br</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center" style={{ backgroundColor: '#0F172A' }}>
        <img src={lookChinaLogo} alt="Look China" className="h-10 mx-auto mb-4 opacity-60" />
        <p className="text-gray-500 text-sm">© 2026 Look Envios — Powered by BRHUB Tech & Look China</p>
        <p className="text-gray-600 text-xs mt-2">Tecnologia · Inteligência Financeira · Atendimento com IA</p>
      </footer>
    </div>
  );
};

export default LookEnviosPage;
