import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Package, Truck, BarChart3, Shield, Zap, Globe, Bot, MessageSquare,
  Bell, CreditCard, FileText, Cpu, CheckCircle2, Gem,
  MapPin, TrendingUp, Users, Headphones, Smartphone, Mail,
  Send, ChevronDown, Layers, Activity, Server, RefreshCw,
  Target, Settings, Flag, Clock, Ruler, Weight, MapPinned, AlertCircle
} from 'lucide-react';
import lookLogo from '@/assets/look-china-logo-official.svg';
import arquiteturaImg from '@/assets/arquitetura-look-envios-v2.png';
import lookScreenshot1 from '@/assets/look-screenshot-1.png';
import lookScreenshot2 from '@/assets/look-screenshot-2.png';

const BRAND = { orange: '#F26522', orangeLight: '#F7941D', orangeDark: '#D4541E', charcoal: '#333333', dark: '#1A1A1A', lightGray: '#F5F5F5', white: '#FFFFFF' };


const PulseDot = ({ color = BRAND.orange }: { color?: string }) => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: color }} />
  </span>
);

const FlowLine = ({ direction = 'right' }: { direction?: 'right' | 'down' }) => (
  <div className={`relative ${direction === 'right' ? 'w-8 md:w-16 h-1' : 'w-1 h-8 md:h-16'} rounded-full overflow-hidden`} style={{ backgroundColor: '#DDD' }}>
    <motion.div className={`absolute ${direction === 'right' ? 'h-full w-4' : 'w-full h-4'} rounded-full`}
      style={{ background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.orangeLight})` }}
      animate={direction === 'right' ? { x: ['-100%', '500%'] } : { y: ['-100%', '500%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
  </div>
);

const ArchNode = ({ icon: Icon, label, delay, color }: { icon: any; label: string; delay: number; color: string }) => (
  <motion.div initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay, type: 'spring', stiffness: 200 }} className="flex flex-col items-center gap-2">
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2 + delay, repeat: Infinity, ease: 'easeInOut' }}
      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color }}>
      <Icon className="w-7 h-7 text-white" />
    </motion.div>
    <span className="text-xs font-semibold text-center max-w-[80px]" style={{ color: BRAND.charcoal }}>{label}</span>
  </motion.div>
);

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
const tabelaDocumentos = [
  { peso: 'Até 100g', local: 'R$ 5,90', estadual: 'R$ 8,10', r1: 'R$ 8,94', r3: 'R$ 10,35', r4: 'R$ 11,19' },
  { peso: 'Até 250g', local: 'R$ 8,65', estadual: 'R$ 9,41', r1: 'R$ 11,29', r3: 'R$ 14,37', r4: 'R$ 16,21' },
  { peso: 'Até 300g', local: 'R$ 8,99', estadual: 'R$ 9,84', r1: 'R$ 12,07', r3: 'R$ 15,70', r4: 'R$ 17,87' },
  { peso: 'Até 500g', local: 'R$ 10,32', estadual: 'R$ 11,58', r1: 'R$ 15,22', r3: 'R$ 21,05', r4: 'R$ 24,57' },
];
const tabelaEcommerce = [
  { uf: 'SP', destino: 'São Paulo', ate100: 'R$ 11,20*', ate500: 'R$ 13,50*', ate1kg: 'R$ 17,80*', ate2kg: 'R$ 22,50*' },
  { uf: 'BA', destino: 'Salvador', ate100: 'R$ 14,11', ate500: 'R$ 15,43', ate1kg: 'R$ 21,61', ate2kg: 'R$ 27,08' },
  { uf: 'AM', destino: 'Manaus', ate100: 'R$ 18,69', ate500: 'R$ 24,50', ate1kg: 'R$ 29,51', ate2kg: 'R$ 36,16' },
  { uf: 'AC', destino: 'Rio Branco', ate100: 'R$ 20,48', ate500: 'R$ 25,29', ate1kg: 'R$ 38,63', ate2kg: 'R$ 56,57' },
];

const LookEnviosPage = () => {
  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: BRAND.white, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <motion.div className="fixed top-0 left-0 h-1 z-50" style={{ width: progressWidth, background: BRAND.orange }} />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 shadow-md" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <img src={lookLogo} alt="Look China" className="h-9 invert brightness-200" />
          <div className="hidden md:flex items-center gap-8">
            {['Ecossistema', 'Arquitetura', 'JadLog', 'FLEX', 'Tarifas', 'Funcionalidades'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-white/80 hover:text-white transition-colors">{item}</a>
            ))}
          </div>
          <a href="#contato" className="text-sm font-bold px-5 py-2 rounded-full border-2 transition-all hover:scale-105" style={{ borderColor: BRAND.orange, color: BRAND.orange }}>Fale Conosco</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${BRAND.orange}15, transparent 70%)` }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
          <motion.div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full" style={{ background: `radial-gradient(circle, ${BRAND.orange}10, transparent 70%)` }} animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity }} />
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} className="absolute" style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [0, -20, 0], opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}>
              <Package className="w-8 h-8 text-white/10" />
            </motion.div>
          ))}
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-16">
          <div>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: `${BRAND.orange}20`, color: BRAND.orange }}><PulseDot /> Proposta Comercial 2026</motion.div>
            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-5xl md:text-7xl font-black text-white mb-2 leading-[1.1]">LOOK <span style={{ color: BRAND.orange }}>ENVIOS</span></motion.h1>
            <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-lg font-semibold mb-3" style={{ color: BRAND.orangeLight }}>Ecossistema Logístico de Nova Geração</motion.p>
            <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/60 text-base leading-relaxed mb-8 max-w-xl">Esta proposta consolida o Look Envios como a solução logística mais completa do mercado, integrando transporte, gestão financeira automatizada e suporte inteligente ao cliente.</motion.p>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-2 mb-8">
              {['Correios Diamante', 'JadLog', 'FLEX'].map((t, i) => (
                <span key={i} className="px-4 py-2 rounded-full text-sm font-semibold text-white/90 border border-white/15" style={{ backgroundColor: `${BRAND.orange}${15 + i * 8}` }}>{t}</span>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="relative hidden lg:block">
            <motion.img src={lookScreenshot1} alt="Look China App" className="w-full rounded-2xl shadow-2xl border-2" style={{ borderColor: `${BRAND.orange}30` }} animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.img src={lookScreenshot2} alt="Look China Logo" className="absolute -bottom-6 -left-6 w-40 rounded-xl shadow-xl" animate={{ y: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
          </motion.div>
        </div>
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}><ChevronDown className="w-6 h-6 text-white/30" /></motion.div>
      </section>

      {/* ECOSSISTEMA */}
      <section id="ecossistema" className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>SEÇÃO 1</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>O Ecossistema <span style={{ color: BRAND.orange }}>LOOK Envios</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Centro de comando para sua operação de e-commerce.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ icon: Package, name: 'Correios', desc: 'Cobertura nacional com Tabela Diamante exclusiva. Até 30kg por envio em todo o Brasil.', tag: 'Diamante' }, { icon: Truck, name: 'JadLog', desc: 'Malha privada com mais de 500 pontos. Ideal para volumes maiores e pesos acima de 30kg.', tag: 'Package' }, { icon: Zap, name: 'FLEX', desc: 'Entregas Same Day na Grande São Paulo. Tarifa fixa R$ 18,00 com filtragem por CEP.', tag: 'Same Day' }].map((t, i) => (
              <motion.div key={i} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl" style={{ backgroundColor: BRAND.orange }}>{t.tag}</div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}><t.icon className="w-7 h-7" style={{ color: BRAND.orange }} /></div>
                <h3 className="text-xl font-bold mb-2" style={{ color: BRAND.charcoal }}>{t.name}</h3>
                <p className="text-gray-500 text-sm">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ARQUITETURA */}
      <section id="arquitetura" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}><PulseDot /> Operação em Tempo Real</div>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Arquitetura <span style={{ color: BRAND.orange }}>Look China</span></h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Infraestrutura de alta disponibilidade para emissões em massa e rastreamento.</p>
          </motion.div>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="mb-16 rounded-2xl overflow-hidden shadow-2xl border-2" style={{ borderColor: `${BRAND.orange}30` }}>
            <img src={arquiteturaImg} alt="Arquitetura Técnica Look Envios" className="w-full" />
          </motion.div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 md:gap-5 flex-wrap justify-center">
              <ArchNode icon={Smartphone} label="App Look China" delay={0} color={BRAND.orange} />
              <FlowLine /><ArchNode icon={Globe} label="Marketplace" delay={0.1} color={BRAND.orangeLight} />
              <FlowLine /><ArchNode icon={Cpu} label="API REST" delay={0.2} color={BRAND.orangeDark} />
              <FlowLine /><ArchNode icon={MessageSquare} label="WhatsApp" delay={0.3} color="#25D366" />
            </div>
            <FlowLine direction="down" />
            <motion.div className="relative w-full max-w-2xl" initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
              <div className="rounded-3xl p-8 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${BRAND.charcoal}, ${BRAND.dark})` }}>
                {[...Array(5)].map((_, i) => (<motion.div key={i} className="absolute h-px bg-white/10" style={{ top: `${20 + i * 15}%`, left: 0, right: 0 }} animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />))}
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-3"><Activity className="w-6 h-6" style={{ color: BRAND.orange }} /><h3 className="text-2xl md:text-3xl font-black text-white">LOOK ENVIOS</h3><PulseDot /></div>
                  <p className="text-gray-400 text-sm">Motor de Cotação • Emissão • Rastreamento • IA • Split Financeiro</p>
                  <div className="flex justify-center gap-3 mt-4 flex-wrap">
                    {['Cotando...', 'Emitindo...', 'Rastreando...', 'Notificando...'].map((t, i) => (
                      <motion.div key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: `${BRAND.orange}20` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}>
                        <RefreshCw className="w-3 h-3 animate-spin" style={{ color: BRAND.orange, animationDuration: `${3 + i}s` }} />
                        <span className="text-xs font-medium" style={{ color: BRAND.orange }}>{t}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            <FlowLine direction="down" />
            <div className="flex items-center gap-2 md:gap-5 flex-wrap justify-center">
              <ArchNode icon={FileText} label="Etiquetas" delay={0.5} color="#16A34A" /><FlowLine />
              <ArchNode icon={MapPin} label="Rastreio" delay={0.6} color="#2563EB" /><FlowLine />
              <ArchNode icon={Bell} label="Notificações" delay={0.7} color="#7C3AED" /><FlowLine />
              <ArchNode icon={CreditCard} label="Split" delay={0.8} color="#DB2777" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ JADLOG ═══════ */}
      <section id="jadlog" className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}25`, color: BRAND.orange }}>
              <Truck className="w-3 h-3 inline mr-1" /> TRANSPORTADORA PARCEIRA
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">JadLog <span style={{ color: BRAND.orange }}>Package</span></h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">A JadLog é uma das maiores transportadoras do Brasil, com malha própria de mais de 500 filiais e pontos de coleta. Ideal para volumes maiores, peso acima de 30kg, e entregas que exigem agilidade em todo o território nacional.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Weight, title: 'Peso até 150kg', desc: 'Aceita encomendas de até 150kg (via coleta). Pontos de postagem aceitam até 30kg. Ideal para produtos pesados e volumes grandes.' },
              { icon: Ruler, title: 'Dimensões até 140cm', desc: 'Máx. 140×140×140cm por dimensão individual. Soma C+L+A até 240cm. Volumes acima de 80cm em uma dimensão podem ter taxa adicional.' },
              { icon: Truck, title: '.Package (E-commerce)', desc: 'Modalidade exclusiva para e-commerce: postagem em pontos parceiros, coleta programada, e preços diferenciados para lojistas.' },
              { icon: Clock, title: 'Prazos Reduzidos', desc: 'Entrega em 2 a 8 dias úteis dependendo da região. Prazo competitivo especialmente para rotas Sul/Sudeste.' },
              { icon: MapPinned, title: '+500 Pontos de Coleta', desc: 'Rede ampla de pontos de postagem em todo o Brasil. Estabelecimentos parceiros para postagem sem precisar de coleta.' },
              { icon: Globe, title: 'Cobertura Nacional', desc: 'Atende todas as capitais e principais cidades do interior. Complementa os Correios em regiões com melhor custo-benefício.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }} whileHover={{ y: -6 }} className="rounded-2xl p-6 border" style={{ backgroundColor: `${BRAND.white}08`, borderColor: `${BRAND.white}10` }}>
                <item.icon className="w-10 h-10 mb-4" style={{ color: BRAND.orange }} />
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Quando usar JadLog vs Correios */}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl border p-8" style={{ backgroundColor: `${BRAND.orange}08`, borderColor: `${BRAND.orange}20` }}>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><AlertCircle className="w-6 h-6" style={{ color: BRAND.orange }} /> Quando usar JadLog?</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider" style={{ color: BRAND.orange }}>✅ Ideal para:</h4>
                {[
                  'Volumes acima de 30kg (limite dos Correios)',
                  'Dimensões superiores a 100cm (limite PAC)',
                  'Rotas Sul/Sudeste com melhor custo-benefício',
                  'Lojistas que precisam de coleta programada',
                  'Produtos frágeis ou que requerem manuseio especial',
                  'E-commerce com alto volume de envios diários',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND.orangeLight }}>📊 Especificações Técnicas</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Peso máximo (coleta)', value: '150 kg' },
                    { label: 'Peso máximo (ponto)', value: '30 kg' },
                    { label: 'Dimensão máxima', value: '140 cm' },
                    { label: 'Soma C+L+A', value: '240 cm' },
                    { label: 'Taxa extra (>80cm)', value: 'Pode incidir' },
                    { label: 'Peso cubado (>50kg)', value: 'Taxa adicional' },
                  ].map((spec, i) => (
                    <div key={i} className="flex justify-between items-center rounded-lg px-3 py-2" style={{ backgroundColor: `${BRAND.white}05` }}>
                      <span className="text-gray-400 text-sm">{spec.label}</span>
                      <span className="text-white font-bold text-sm">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FLEX ═══════ */}
      <section id="flex" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>
              <Zap className="w-3 h-3 inline mr-1" /> ENTREGA EXPRESSA
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>FLEX — <span style={{ color: BRAND.orange }}>Same Day Grande SP</span></h2>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">Entregas no mesmo dia ou no dia seguinte na Grande São Paulo. Tarifa fixa de R$ 18,00 com filtragem automática por CEP — o frete só é apresentado ao cliente se o CEP de destino estiver na área de atendimento.</p>
          </motion.div>

          {/* Destaque tarifa */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl p-8 border text-center" style={{ background: `linear-gradient(135deg, ${BRAND.orange}10, ${BRAND.orange}05)`, borderColor: `${BRAND.orange}20` }}>
              <div className="text-5xl font-black mb-2" style={{ color: BRAND.orange }}>R$ 18</div>
              <div className="text-lg font-bold" style={{ color: BRAND.charcoal }}>Tarifa Fixa</div>
              <div className="text-gray-500 text-sm mt-1">Grande São Paulo</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl p-8 border text-center" style={{ background: `linear-gradient(135deg, ${BRAND.orange}10, ${BRAND.orange}05)`, borderColor: `${BRAND.orange}20` }}>
              <div className="text-5xl font-black mb-2" style={{ color: BRAND.orange }}>D+0</div>
              <div className="text-lg font-bold" style={{ color: BRAND.charcoal }}>Same Day</div>
              <div className="text-gray-500 text-sm mt-1">Pedidos até 12h</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl p-8 border text-center" style={{ background: `linear-gradient(135deg, ${BRAND.orange}10, ${BRAND.orange}05)`, borderColor: `${BRAND.orange}20` }}>
              <div className="text-5xl font-black mb-2" style={{ color: BRAND.orange }}>CEP</div>
              <div className="text-lg font-bold" style={{ color: BRAND.charcoal }}>Filtragem Inteligente</div>
              <div className="text-gray-500 text-sm mt-1">Apresenta só se atende</div>
            </motion.div>
          </div>

          {/* Como funciona */}
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.charcoal }}><MapPinned className="w-6 h-6" style={{ color: BRAND.orange }} /> Como Funciona a Filtragem por CEP</h3>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Cliente informa o CEP de destino', desc: 'No simulador ou checkout, o sistema captura o CEP do destinatário.' },
                  { step: '02', title: 'Validação de cobertura FLEX', desc: 'O motor verifica se o CEP está dentro da área de atendimento (Grande SP).' },
                  { step: '03', title: 'Frete FLEX apresentado', desc: 'Se o CEP é atendido, a opção FLEX R$ 18,00 aparece ao lado das demais transportadoras.' },
                  { step: '04', title: 'Fora da área? Não aparece.', desc: 'Se o CEP não está na cobertura, o FLEX simplesmente não é exibido — sem erro, sem confusão.' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 rounded-xl p-4 border border-gray-100" style={{ backgroundColor: BRAND.lightGray }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white" style={{ backgroundColor: BRAND.orange }}>{item.step}</div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: BRAND.charcoal }}>{item.title}</h4>
                      <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.charcoal }}><MapPin className="w-6 h-6" style={{ color: BRAND.orange }} /> Regiões Atendidas</h3>
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: BRAND.lightGray }}>
                <div className="px-5 py-3 font-bold text-sm text-white" style={{ backgroundColor: BRAND.orange }}>Grande São Paulo — Cobertura FLEX</div>
                <div className="p-5 space-y-3">
                  {[
                    { regiao: 'Capital SP', ceps: '01000-000 a 05999-000', status: '✅' },
                    { regiao: 'Zona Leste', ceps: '08000-000 a 08499-000', status: '✅' },
                    { regiao: 'Zona Sul', ceps: '04000-000 a 04999-000', status: '✅' },
                    { regiao: 'ABCDM', ceps: '09000-000 a 09999-000', status: '✅' },
                    { regiao: 'Guarulhos', ceps: '07000-000 a 07399-000', status: '✅' },
                    { regiao: 'Osasco', ceps: '06000-000 a 06299-000', status: '✅' },
                    { regiao: 'Barueri/Carapicuíba', ceps: '06300-000 a 06499-000', status: '✅' },
                    { regiao: 'Taboão/Embu', ceps: '06700-000 a 06899-000', status: '✅' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2 bg-white border border-gray-100">
                      <div>
                        <span className="font-bold text-sm" style={{ color: BRAND.charcoal }}>{r.regiao}</span>
                        <span className="text-gray-400 text-xs ml-2">{r.ceps}</span>
                      </div>
                      <span className="text-green-500 font-bold">{r.status}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 text-xs text-gray-500 italic border-t border-gray-200">
                  A cobertura é validada automaticamente por CEP no momento da cotação. Novas regiões são adicionadas conforme expansão.
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BRANDING */}
      <section className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>SEÇÃO 2</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Branding: <span style={{ color: BRAND.orange }}>Sua Marca em Cada Pacote</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: BRAND.charcoal }}><FileText className="w-5 h-5" style={{ color: BRAND.orange }} /> Etiquetas Personalizadas</h3>
                <p className="text-gray-500 text-sm">Todas as etiquetas carregam a logomarca LOOK Envios, criando percepção de marca corporativa sólida.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: BRAND.charcoal }}><Layers className="w-5 h-5" style={{ color: BRAND.orange }} /> Interface Unificada</h3>
                <p className="text-gray-500 text-sm">Painéis com identidade visual vibrante (Laranja e Branco) reforçando segurança e modernidade.</p>
              </div>
            </motion.div>
            <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="rounded-3xl p-8 border" style={{ background: `linear-gradient(135deg, ${BRAND.orange}08, ${BRAND.orange}15)`, borderColor: `${BRAND.orange}30` }}>
                <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND.orange }}><Package className="w-5 h-5 text-white" /></div>
                    <div><div className="font-bold" style={{ color: BRAND.charcoal }}>Etiqueta #LK20260318</div><div className="text-xs text-gray-500">PAC • Look Envios</div></div>
                    <PulseDot />
                  </div>
                  {['Objeto Postado', 'Em Trânsito', 'Saiu para Entrega', 'Entregue'].map((s, i) => (
                    <motion.div key={i} className="flex items-center gap-3" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 1 ? BRAND.orange : '#D1D5DB' }} />
                      <span className={`text-sm ${i === 1 ? 'font-semibold' : ''}`} style={{ color: i === 1 ? BRAND.orange : '#9CA3AF' }}>{s}</span>
                      {i === 1 && <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}><Truck className="w-4 h-4" style={{ color: BRAND.orange }} /></motion.div>}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* IA & ATENDIMENTO */}
      <section className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}25`, color: BRAND.orange }}>SEÇÃO 3 — POWERED BY BRHUB CONECTA</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Atendimento Inteligente e <span style={{ color: BRAND.orange }}>Suporte com IA</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[{ icon: Bot, title: 'Assistentes IA (24/7)', desc: 'IA treinada para dúvidas sobre prazos, status e troca.' }, { icon: Activity, title: 'Triagem Inteligente', desc: 'Resolve problemas simples, escala casos complexos.' }, { icon: MessageSquare, title: 'Automação', desc: 'Respostas automatizadas sobre rastreamento.' }, { icon: Bell, title: 'Rastreamento WhatsApp', desc: 'Alertas: Postado, Em Trânsito, Entregue.' }, { icon: Shield, title: 'Alertas de Exceção', desc: 'Identificação proativa de atrasos.' }, { icon: Headphones, title: 'Gestão de Protocolos', desc: 'Canais centralizados em interface única.' }].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }} whileHover={{ y: -6 }} className="rounded-2xl p-6 border" style={{ backgroundColor: `${BRAND.white}08`, borderColor: `${BRAND.white}10` }}>
                <item.icon className="w-10 h-10 mb-4" style={{ color: BRAND.orange }} />
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINANCEIRO */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>SEÇÃO 4</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Inteligência <span style={{ color: BRAND.orange }}>Financeira</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            {[{ icon: CreditCard, title: 'Split de Pagamento', items: ['Repasse Direto: componente do frete segregado automaticamente.', 'Liquidez Operacional: recursos sempre disponíveis.'] }, { icon: FileText, title: 'Política de Faturamento', items: ['Vendas Externas: faturas detalhadas para gestão profissional.', 'Marketplace: atua apenas como emissor e rastreador.'] }].map((card, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl p-8 border border-gray-100" style={{ backgroundColor: BRAND.lightGray }}>
                <card.icon className="w-10 h-10 mb-4" style={{ color: BRAND.orange }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: BRAND.charcoal }}>{card.title}</h3>
                <ul className="space-y-3">{card.items.map((item, j) => (<li key={j} className="flex items-start gap-2 text-gray-600 text-sm"><CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> {item}</li>))}</ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SPECS */}
      <section className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>SEÇÃO 5</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Especificações <span style={{ color: BRAND.orange }}>Técnicas</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ icon: Server, label: 'API RESTful', desc: 'JSON + Swagger' }, { icon: Zap, label: 'Webhooks', desc: 'Tempo real' }, { icon: FileText, label: 'Etiquetas', desc: 'PDF e ZPL' }, { icon: Shield, label: 'Segurança', desc: 'OAuth2 + criptografia' }, { icon: Activity, label: 'SLA 99.9%', desc: 'Alta disponibilidade' }, { icon: RefreshCw, label: 'Ambientes', desc: 'Staging + Prod' }].map((spec, i) => (
              <motion.div key={i} initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.orange}10` }}><spec.icon className="w-5 h-5" style={{ color: BRAND.orange }} /></div>
                <div><div className="font-bold text-sm" style={{ color: BRAND.charcoal }}>{spec.label}</div><div className="text-gray-500 text-xs">{spec.desc}</div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFAS DIAMANTE */}
      <section id="tarifas" className="py-20 relative overflow-hidden" style={{ backgroundColor: BRAND.dark }}>
        <motion.div className="absolute top-10 right-10 opacity-5" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}><Gem className="w-60 h-60" style={{ color: BRAND.orange }} /></motion.div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}25`, color: BRAND.orange }}><Gem className="w-3 h-3 inline mr-1" /> EXCLUSIVO LOOK ENVIOS</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Tabela <span style={{ color: BRAND.orange }}>Diamante</span> Correios</h2>
            <p className="text-gray-500 text-lg">Até 85% mais barato que a tabela balcão</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[{ label: 'SP Capital', value: 'R$ 6,90', desc: 'PAC até 100g', icon: Target }, { label: 'Economia', value: 'Até 85%', desc: 'vs. Tabela Balcão', icon: TrendingUp }, { label: 'Cobertura', value: '100%', desc: 'Todos os CEPs', icon: Globe }].map((card, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} className="rounded-2xl p-6 border" style={{ background: `linear-gradient(135deg, ${BRAND.orange}18, ${BRAND.orange}08)`, borderColor: `${BRAND.orange}25` }}>
                <card.icon className="w-8 h-8 mb-3" style={{ color: BRAND.orange }} />
                <div className="text-3xl font-black text-white mb-1">{card.value}</div>
                <div className="font-semibold text-sm" style={{ color: BRAND.orangeLight }}>{card.label}</div>
                <div className="text-gray-500 text-xs mt-1">{card.desc}</div>
              </motion.div>
            ))}
          </div>
          {/* PAC Table */}
          <motion.div initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl border overflow-hidden mb-8" style={{ backgroundColor: `${BRAND.white}05`, borderColor: `${BRAND.white}10` }}>
            <div className="px-6 py-3 border-b" style={{ borderColor: `${BRAND.white}10` }}><h3 className="text-white font-bold flex items-center gap-2"><Package className="w-4 h-4" style={{ color: BRAND.orange }} /> PAC — Capitais (Contrato Diamante)</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ backgroundColor: BRAND.orange }}><th className="px-4 py-3 text-left text-white font-bold">Faixa</th><th className="px-4 py-3 text-center text-white font-bold">SP</th><th className="px-4 py-3 text-center text-white font-bold">Sudeste</th><th className="px-4 py-3 text-center text-white font-bold">Sul</th><th className="px-4 py-3 text-center text-white font-bold">Nordeste</th><th className="px-4 py-3 text-center text-white font-bold">Norte</th></tr></thead>
              <tbody>{tabelaDiamanteData.map((row, i) => (<motion.tr key={i} initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="border-b" style={{ borderColor: `${BRAND.white}05`, backgroundColor: i % 2 === 0 ? `${BRAND.white}03` : 'transparent' }}><td className="px-4 py-3 font-semibold" style={{ color: BRAND.orangeLight }}>{row.faixa}</td><td className="px-4 py-3 text-center font-bold" style={{ color: '#4ADE80' }}>{row.sp}</td><td className="px-4 py-3 text-center text-gray-300">{row.sudeste}</td><td className="px-4 py-3 text-center text-gray-300">{row.sul}</td><td className="px-4 py-3 text-center text-gray-300">{row.nordeste}</td><td className="px-4 py-3 text-center text-gray-300">{row.norte}</td></motion.tr>))}</tbody></table></div>
          </motion.div>
          {/* Documentos */}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" style={{ color: BRAND.orange }} /> Documentos e Cartões</h3>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: `${BRAND.white}05`, borderColor: `${BRAND.white}10` }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ backgroundColor: `${BRAND.orange}80` }}><th className="px-4 py-2.5 text-left text-white font-bold">Peso</th><th className="px-4 py-2.5 text-center text-white font-bold">Local</th><th className="px-4 py-2.5 text-center text-white font-bold">Estadual</th><th className="px-4 py-2.5 text-center text-white font-bold">Sul/Sudeste</th><th className="px-4 py-2.5 text-center text-white font-bold">Nordeste</th><th className="px-4 py-2.5 text-center text-white font-bold">Norte</th></tr></thead>
              <tbody>{tabelaDocumentos.map((row, i) => (<tr key={i} className="border-b" style={{ borderColor: `${BRAND.white}05`, backgroundColor: i % 2 === 0 ? `${BRAND.white}03` : 'transparent' }}><td className="px-4 py-2.5 font-semibold" style={{ color: BRAND.orangeLight }}>{row.peso}</td><td className="px-4 py-2.5 text-center font-bold" style={{ color: '#4ADE80' }}>{row.local}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.estadual}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.r1}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.r3}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.r4}</td></tr>))}</tbody></table></div></div>
          </motion.div>
          {/* E-commerce */}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Package className="w-5 h-5" style={{ color: BRAND.orange }} /> E-commerce Capitais</h3>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: `${BRAND.white}05`, borderColor: `${BRAND.white}10` }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ backgroundColor: `${BRAND.orange}80` }}><th className="px-4 py-2.5 text-left text-white font-bold">UF</th><th className="px-4 py-2.5 text-left text-white font-bold">Destino</th><th className="px-4 py-2.5 text-center text-white font-bold">Até 100g</th><th className="px-4 py-2.5 text-center text-white font-bold">Até 500g</th><th className="px-4 py-2.5 text-center text-white font-bold">Até 1kg</th><th className="px-4 py-2.5 text-center text-white font-bold">Até 2kg</th></tr></thead>
              <tbody>{tabelaEcommerce.map((row, i) => (<tr key={i} className="border-b" style={{ borderColor: `${BRAND.white}05`, backgroundColor: i % 2 === 0 ? `${BRAND.white}03` : 'transparent' }}><td className="px-4 py-2.5 font-bold" style={{ color: BRAND.orange }}>{row.uf}</td><td className="px-4 py-2.5 text-gray-300">{row.destino}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.ate100}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.ate500}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.ate1kg}</td><td className="px-4 py-2.5 text-center text-gray-300">{row.ate2kg}</td></tr>))}</tbody></table></div>
              <div className="px-6 py-2 text-xs text-gray-500 italic border-t" style={{ borderColor: `${BRAND.white}05` }}>*Valores médios para regiões metropolitanas.</div></div>
          </motion.div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>PLATAFORMA</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Funcionalidades da <span style={{ color: BRAND.orange }}>Plataforma</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ icon: Package, title: 'Emissão de Etiquetas', desc: 'Individual com branding personalizado.' }, { icon: BarChart3, title: 'Simulador de Frete', desc: 'Compare transportadoras em tempo real.' }, { icon: MapPin, title: 'Rastreamento', desc: 'Mapa interativo com alertas.' }, { icon: Bot, title: 'CRM com IA', desc: 'Múltiplos canais WhatsApp.' }, { icon: Bell, title: 'Notificações', desc: 'HSM em cada etapa.' }, { icon: FileText, title: 'Faturas', desc: 'PDF, boletos, controle.' }, { icon: Users, title: 'Multi-Remetentes', desc: 'Sync automática.' }, { icon: BarChart3, title: 'Relatórios', desc: 'KPIs por UF e serviço.' }, { icon: Shield, title: 'Segurança', desc: 'Criptografia e auditoria.' }].map((f, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }} whileHover={{ y: -4 }} className="rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all" style={{ backgroundColor: BRAND.lightGray }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}><f.icon className="w-6 h-6" style={{ color: BRAND.orange }} /></div>
                <h3 className="text-lg font-bold mb-2" style={{ color: BRAND.charcoal }}>{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: `${BRAND.orange}15`, color: BRAND.orange }}>SEÇÃO 7</span>
            <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: BRAND.charcoal }}>Cronograma de <span style={{ color: BRAND.orange }}>Entrega</span></h2>
          </motion.div>
          <div className="max-w-3xl mx-auto">
            {[{ fase: 'Fase 1', title: 'Ativação e Configuração', desc: 'Conta e Gateway de Pagamento/Split.', icon: Settings }, { fase: 'Fase 2', title: 'Treinamento da IA', desc: 'IA baseada no histórico de SAC.', icon: Bot }, { fase: 'Fase 3', title: 'Integração e Testes', desc: 'API e notificações multicanal.', icon: Cpu }, { fase: 'Fase 4', title: 'Lançamento Oficial', desc: 'Go-Live da plataforma.', icon: Flag }].map((step, i) => (
              <motion.div key={i} initial={{ x: i % 2 === 0 ? -40 : 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="flex items-start gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: i === 3 ? '#16A34A' : BRAND.orange }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}><step.icon className="w-7 h-7 text-white" /></motion.div>
                  {i < 3 && <div className="w-0.5 h-12 mt-2" style={{ backgroundColor: `${BRAND.orange}30` }} />}
                </div>
                <div className="pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BRAND.orange }}>{step.fase}</span>
                  <h3 className="text-xl font-bold mt-1" style={{ color: BRAND.charcoal }}>{step.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contato" className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <img src={lookLogo} alt="Look China" className="h-14 mx-auto mb-6 invert brightness-200 opacity-80" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Conectando o Brasil com <span style={{ color: BRAND.orange }}>Inteligência</span></h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Look China + BRHUB = o ecossistema logístico mais completo do mercado.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a href="https://wa.me/5511999999999" target="_blank" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg shadow-xl text-white" style={{ backgroundColor: BRAND.orange }}><Send className="w-5 h-5" /> Falar com Consultor</motion.a>
              <motion.a href="mailto:contato@lookenvios.com.br" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-2 text-white border-2 px-8 py-4 rounded-full font-bold text-lg" style={{ borderColor: `${BRAND.orange}50` }}><Mail className="w-5 h-5" /> Enviar E-mail</motion.a>
            </div>
            <p className="text-gray-600 text-sm mt-8">www.lookchina.com.br</p>
          </motion.div>
        </div>
      </section>

      <footer className="py-6 text-center" style={{ backgroundColor: BRAND.dark }}>
        <p className="text-gray-600 text-sm">© 2026 Look Envios — Powered by BRHUB Tech & Look China</p>
      </footer>
    </div>
  );
};

export default LookEnviosPage;
