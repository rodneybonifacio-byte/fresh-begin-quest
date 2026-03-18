import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Package, Truck, BarChart3, Shield, Zap, Globe, Bot, MessageSquare,
  Bell, CreditCard, FileText, Cpu, CheckCircle2, Gem,
  MapPin, TrendingUp, Users, Headphones, Smartphone, Mail,
  Send, ChevronDown, Layers, Activity, Server, Database, RefreshCw,
  Star, Award, Target
} from 'lucide-react';
import lookChinaLogo from '@/assets/look-china-logo.png';


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
      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-lg"
      style={{ backgroundColor: color }}
    >
      <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
    </motion.div>
    <span className="text-xs md:text-sm font-semibold text-gray-700 text-center max-w-[90px]">{label}</span>
  </motion.div>
);

// ─── Flowing data line ───────────────────────────────────────────
const FlowLine = ({ direction = 'right' }: { direction?: 'right' | 'down' }) => (
  <div className={`relative ${direction === 'right' ? 'w-12 md:w-20 h-1' : 'w-1 h-12 md:h-20'} bg-gray-200 rounded-full overflow-hidden`}>
    <motion.div
      className={`absolute ${direction === 'right' ? 'h-full w-4' : 'w-full h-4'} bg-gradient-to-r from-orange-400 to-orange-600 rounded-full`}
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

// ─── Tabela Diamante data ────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────
const LookEnviosPage = () => {
  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 z-50" style={{ width: progressWidth }} />

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)' }}>
        {/* Animated background shapes */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full border border-white/10" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} className="absolute -bottom-60 -left-60 w-[800px] h-[800px] rounded-full border border-white/5" />
        
        {/* Floating packages */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
          >
            <Package className="w-8 h-8 text-white/20" />
          </motion.div>
        ))}

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.img
            src={lookChinaLogo}
            alt="Look China"
            className="h-20 md:h-28 mx-auto mb-8 drop-shadow-2xl"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.h1
            className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            LOOK <span className="text-orange-200">ENVIOS</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-2xl text-orange-100 max-w-3xl mx-auto mb-8 leading-relaxed"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Ecossistema Logístico de Nova Geração — Tecnologia Look China, Inteligência Financeira BRHUB e Atendimento com IA 24/7
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4 mb-12"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {['Correios Diamante', 'JadLog', 'Flex Envios', 'BusLog'].map((t, i) => (
              <span key={i} className="bg-white/15 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-semibold border border-white/20">
                {t}
              </span>
            ))}
          </motion.div>

          {/* KPIs */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {[
              { value: 320, suffix: 'k', label: 'Envios/Mês' },
              { value: 8, prefix: 'R$ ', suffix: 'M', label: 'Volume Mensal' },
              { value: 5570, label: 'Cidades Atendidas' },
              { value: 99, suffix: '%', label: 'Uptime' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
                <div className="text-2xl md:text-3xl font-black text-white">
                  <Counter end={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix} />
                </div>
                <div className="text-orange-200 text-sm font-medium">{kpi.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="mt-12" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown className="w-8 h-8 text-white/50 mx-auto" />
          </motion.div>
        </div>
      </section>

      {/* ═══════ TRANSPORTADORAS ═══════ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Ecossistema de <span className="text-orange-600">Transportadoras</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Acesso imediato às maiores transportadoras do país em uma única plataforma</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Package, name: 'Correios', desc: 'Cobertura nacional total para PAC e SEDEX com Tabela Diamante exclusiva', color: '#EA580C', tag: 'Diamante' },
              { icon: Truck, name: 'JadLog', desc: 'Malha privada de alta eficiência para prazos curtos e e-commerce', color: '#C2410C', tag: 'Express' },
              { icon: Zap, name: 'Flex Envios', desc: 'Otimização para entregas no mesmo dia ou no dia seguinte (Last Mile)', color: '#9A3412', tag: 'Same Day' },
              { icon: Globe, name: 'BusLog', desc: 'Soluções rodoviárias estratégicas para grandes volumes e distâncias', color: '#7C2D12', tag: 'Rodoviário' },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl" style={{ backgroundColor: t.color }}>{t.tag}</div>
                <motion.div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${t.color}15` }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                >
                  <t.icon className="w-7 h-7" style={{ color: t.color }} />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ARQUITETURA ANIMADA ═══════ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <PulseDot /> Operação em Tempo Real
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Arquitetura <span className="text-orange-600">Look Envios</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Infraestrutura de alta disponibilidade com processamento inteligente</p>
          </motion.div>

          {/* Architecture Flow */}
          <div className="flex flex-col items-center gap-4">
            {/* Top row: Input sources */}
            <div className="flex items-center gap-3 md:gap-6 flex-wrap justify-center">
              <ArchNode icon={Smartphone} label="App Look China" delay={0} color="#EA580C" />
              <FlowLine />
              <ArchNode icon={Globe} label="Marketplace" delay={0.1} color="#F97316" />
              <FlowLine />
              <ArchNode icon={Cpu} label="API REST" delay={0.2} color="#FB923C" />
              <FlowLine />
              <ArchNode icon={MessageSquare} label="WhatsApp" delay={0.3} color="#FDBA74" />
            </div>

            {/* Arrow down */}
            <div className="flex items-center gap-8">
              <FlowLine direction="down" />
            </div>

            {/* Core: Look Envios Platform */}
            <motion.div
              className="relative w-full max-w-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-center relative overflow-hidden">
                {/* Animated data streams inside */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-px bg-white/20"
                    style={{ top: `${20 + i * 15}%`, left: 0, right: 0 }}
                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Activity className="w-6 h-6 text-white" />
                    <h3 className="text-2xl md:text-3xl font-black text-white">LOOK ENVIOS</h3>
                    <PulseDot color="#fff" />
                  </div>
                  <p className="text-orange-100 text-sm">Motor de Cotação • Emissão de Etiquetas • Rastreamento • IA • Split Financeiro</p>
                  
                  {/* Mini animated processing indicators */}
                  <div className="flex justify-center gap-6 mt-4">
                    {['Cotando...', 'Emitindo...', 'Rastreando...'].map((t, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
                      >
                        <RefreshCw className="w-3 h-3 text-white animate-spin" style={{ animationDuration: `${3 + i}s` }} />
                        <span className="text-xs text-white font-medium">{t}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Arrow down */}
            <div className="flex items-center gap-8">
              <FlowLine direction="down" />
            </div>

            {/* Bottom row: Output */}
            <div className="flex items-center gap-3 md:gap-6 flex-wrap justify-center">
              <ArchNode icon={FileText} label="Etiquetas" delay={0.5} color="#16A34A" />
              <FlowLine />
              <ArchNode icon={MapPin} label="Rastreio" delay={0.6} color="#2563EB" />
              <FlowLine />
              <ArchNode icon={Bell} label="Notificações" delay={0.7} color="#7C3AED" />
              <FlowLine />
              <ArchNode icon={CreditCard} label="Split Financeiro" delay={0.8} color="#DB2777" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TABELA DIAMANTE ═══════ */}
      <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
        {/* Background gem effect */}
        <motion.div
          className="absolute top-10 right-10 text-orange-500/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <Gem className="w-60 h-60" />
        </motion.div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Gem className="w-4 h-4" /> Exclusivo Look Envios
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Tabela <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Diamante</span> Correios
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Os melhores preços do mercado com contrato exclusivo — até 70% mais barato que a tabela balcão
            </p>
          </motion.div>

          {/* Tabela visual */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-600 to-orange-500">
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
                    <motion.tr
                      key={i}
                      initial={{ x: -30, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-orange-500/10 transition-colors`}
                    >
                      <td className="px-4 py-3 text-orange-300 font-semibold">{row.faixa}</td>
                      <td className="px-4 py-3 text-center text-green-400 font-bold">{row.sp}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.sudeste}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.sul}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.nordeste}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.norte}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gradient-to-r from-orange-600/20 to-transparent border-t border-white/5">
              <div className="flex items-center gap-2 text-orange-300 text-sm">
                <Star className="w-4 h-4" />
                <span className="font-semibold">Valores referentes a PAC Capitais — Contrato Diamante exclusivo para parceiros Look Envios</span>
              </div>
            </div>
          </motion.div>

          {/* Tabela Flex Envios highlight */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            {[
              { label: 'SP Capital', value: 'R$ 6,90', desc: 'A partir de — PAC até 100g', icon: Target },
              { label: 'Economia', value: 'Até 70%', desc: 'vs. Tabela Balcão Correios', icon: TrendingUp },
              { label: 'Cobertura', value: '100%', desc: 'Nacional — todos os CEPs', icon: Globe },
            ].map((card, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl p-6 border border-orange-500/20"
              >
                <card.icon className="w-8 h-8 text-orange-400 mb-3" />
                <div className="text-3xl font-black text-white mb-1">{card.value}</div>
                <div className="text-orange-300 font-semibold text-sm">{card.label}</div>
                <div className="text-gray-500 text-xs mt-1">{card.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ FUNCIONALIDADES DA PLATAFORMA ═══════ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Funcionalidades da <span className="text-orange-600">Plataforma</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Tudo que você precisa para gerenciar sua logística em um só lugar</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Package, title: 'Emissão de Etiquetas', desc: 'Emissão individual ou em massa via planilha CSV/XLSX. Etiquetas com branding Look Envios em PDF ou ZPL (térmica).', color: '#EA580C' },
              { icon: BarChart3, title: 'Simulador de Frete', desc: 'Compare preços entre Correios, JadLog, Flex e BusLog em tempo real. Escolha a melhor opção para cada envio.', color: '#2563EB' },
              { icon: MapPin, title: 'Rastreamento Inteligente', desc: 'Rastreio em tempo real com mapa interativo. Alertas proativos de atrasos e status em cada etapa.', color: '#16A34A' },
              { icon: Bot, title: 'Atendimento com IA 24/7', desc: 'Assistentes de IA treinados para responder dúvidas sobre prazos, status e procedimentos. Triagem inteligente automática.', color: '#7C3AED' },
              { icon: Bell, title: 'Notificações WhatsApp', desc: 'Alertas automáticos via WhatsApp em cada etapa: Postado, Em Trânsito, Saiu para Entrega, Entregue.', color: '#059669' },
              { icon: CreditCard, title: 'Split Financeiro', desc: 'Repasse automático do frete segregado no ato da venda. Liquidez operacional sem comprometer capital de giro.', color: '#DB2777' },
              { icon: FileText, title: 'Gestão de Faturas', desc: 'Faturas detalhadas para vendas externas. Integração com marketplaces sem bitributação.', color: '#D97706' },
              { icon: Users, title: 'Multi-Remetentes', desc: 'Gerencie múltiplos remetentes e endereços de origem. Ideal para operações com vários pontos de despacho.', color: '#6366F1' },
              { icon: BarChart3, title: 'Relatórios de Desempenho', desc: 'Dashboard com KPIs de entrega: no prazo, atrasados, em trânsito. Análise por UF, serviço e remetente.', color: '#0891B2' },
              { icon: Shield, title: 'Segurança de Dados', desc: 'Criptografia de dados sensíveis, RLS em banco de dados e auditoria completa de acessos.', color: '#DC2626' },
              { icon: Layers, title: 'Integração via API', desc: 'API RESTful com documentação Swagger. Webhooks dinâmicos para status logísticos e financeiros.', color: '#8B5CF6' },
              { icon: Headphones, title: 'Suporte Humanizado', desc: 'Pipeline inteligente de tickets com categorização automática. Escalamento de casos complexos para atendimento humano.', color: '#F43F5E' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}12` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ BRANDING ═══════ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">
                Sua Marca em <span className="text-orange-600">Cada Pacote</span>
              </h2>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                No LOOK Envios, a entrega é o momento da verdade. Elevamos o profissionalismo da sua operação com etiquetas personalizadas e interface unificada.
              </p>
              <div className="space-y-4">
                {[
                  'Etiquetas com logomarca Look Envios em cada postagem',
                  'Interface unificada com identidade visual vibrante',
                  'Percepção de marca corporativa sólida e confiável',
                  'Suporte a PDF e ZPL (impressão térmica)',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Animated mockup */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border border-orange-200">
                <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Etiqueta #LK20260318</div>
                      <div className="text-xs text-gray-500">PAC • Look Envios</div>
                    </div>
                    <PulseDot />
                  </div>
                  {/* Animated status */}
                  {['Objeto Postado', 'Em Trânsito', 'Saiu para Entrega'].map((s, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
                    >
                      <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                      <span className={`text-sm ${i === 1 ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>{s}</span>
                      {i === 1 && <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}><Truck className="w-4 h-4 text-orange-500" /></motion.div>}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ IA & ATENDIMENTO ═══════ */}
      <section className="py-20 md:py-28" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Atendimento com <span className="text-orange-200">IA</span></h2>
            <p className="text-orange-100 text-lg max-w-2xl mx-auto">Powered by BRHUB Conecta — redução de até 80% no volume de tickets manuais</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Bot, title: 'Assistentes IA 24/7', desc: 'IA treinada para responder dúvidas sobre prazos, status de entrega e procedimentos de troca automaticamente.' },
              { icon: Activity, title: 'Triagem Inteligente', desc: 'Resolução automática de problemas simples e escalamento organizado de casos complexos para atendimento humanizado.' },
              { icon: Bell, title: 'Notificações Proativas', desc: 'Identificamos atrasos antes do cliente e enviamos alertas proativos via WhatsApp, reduzindo ansiedade e tickets.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/15"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                >
                  <item.icon className="w-10 h-10 text-white mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-orange-100 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INTELIGÊNCIA FINANCEIRA ═══════ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Inteligência <span className="text-orange-600">Financeira</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Conciliação financeira de frete automatizada — integração BRHUB</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200"
            >
              <CreditCard className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Split de Pagamento Automatizado</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Repasse direto — frete automaticamente segregado no ato da venda</li>
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Liquidez operacional — recursos para logística sempre disponíveis</li>
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Desonera o capital de giro principal do negócio</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200"
            >
              <FileText className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Política de Faturamento</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Vendas externas (WhatsApp/Digital): faturas detalhadas com gestão de crédito</li>
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Integração Marketplace: emissor e rastreador sem cobranças duplicadas</li>
                <li className="flex items-start gap-2 text-gray-600"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> Recarga via PIX com QR Code e confirmação instantânea</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ ESPECIFICAÇÕES TÉCNICAS ═══════ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Especificações <span className="text-orange-600">Técnicas</span></h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Server, label: 'API RESTful', desc: 'JSON + Swagger' },
              { icon: Zap, label: 'Webhooks', desc: 'Tempo real' },
              { icon: FileText, label: 'Etiquetas', desc: 'PDF + ZPL' },
              { icon: Database, label: 'Integrações', desc: 'Shopify, Nuvemshop, Tiny' },
              { icon: Shield, label: 'Segurança', desc: 'Criptografia + RLS' },
              { icon: Activity, label: 'SLA', desc: '99.9% Uptime' },
              { icon: Cpu, label: 'Processamento', desc: 'Emissões em massa' },
              { icon: RefreshCw, label: 'Ambiente', desc: 'Staging + Produção' },
            ].map((spec, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <spec.icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{spec.label}</div>
                  <div className="text-gray-500 text-xs">{spec.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)' }}>
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)', backgroundSize: '200% 200%' }}
        />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <Award className="w-16 h-16 text-orange-200 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              Pronto para Revolucionar sua Logística?
            </h2>
            <p className="text-orange-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              O Look Envios combina a tecnologia Look China com a inteligência financeira BRHUB para criar o ecossistema logístico mais completo e acessível do mercado.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="https://wa.me/5511999999999?text=Quero%20saber%20mais%20sobre%20o%20Look%20Envios"
                target="_blank"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-shadow"
              >
                <Send className="w-5 h-5" /> Falar com Consultor
              </motion.a>
              <motion.a
                href="mailto:contato@lookenvios.com.br"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-colors"
              >
                <Mail className="w-5 h-5" /> Enviar E-mail
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8 text-center">
        <img src={lookChinaLogo} alt="Look China" className="h-10 mx-auto mb-4 opacity-60" />
        <p className="text-gray-500 text-sm">© 2026 Look Envios — Powered by BRHUB Tech & Look China</p>
        <p className="text-gray-600 text-xs mt-2">Tecnologia · Inteligência Financeira · Atendimento com IA</p>
      </footer>
    </div>
  );
};

export default LookEnviosPage;
