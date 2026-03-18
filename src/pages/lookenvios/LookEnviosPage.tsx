import { useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, Shield, Zap, Globe, Cpu, CheckCircle2,
  TrendingUp, Users, Send, ChevronDown,
  Target, Clock, Ruler, Weight, MapPinned, AlertCircle,
  Warehouse, ArrowRight, Star, Rocket, CircleDot, BarChart3,
  FileText, Layers, Award, BadgeCheck, Crosshair, Navigation,
  Bot, Activity, MessageSquare, Bell, ShieldCheck, Headphones,
  CreditCard, Receipt, Server, Webhook, FileCode, Lock,
  BarChart, UsersRound, GitBranch, Flag,
  Printer, MapPin, ScanLine, Menu, X
} from 'lucide-react';
import arquiteturaImg from '@/assets/arquitetura-camada-integracao.png';
import lookLogoDark from '@/assets/look-envios-logo-dark.png';

const BRAND = { orange: '#F26522', orangeLight: '#F7941D', orangeDark: '#D4541E', charcoal: '#2B2B2B', dark: '#1A1A1A', cream: '#FAF9F7', white: '#FFFFFF', border: '#E8E5E0' };

/* ── Reusable components ── */

const SectionNumber = ({ n, dark = false }: { n: number; dark?: boolean }) => (
  <div className="flex items-center gap-3 mb-4 md:mb-6">
    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-black text-white" style={{ backgroundColor: BRAND.orange }}>
      {String(n).padStart(2, '0')}
    </div>
    <div className="h-px flex-1" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.08)' : BRAND.border }} />
  </div>
);

const Heading = ({ children, white = false }: { children: React.ReactNode; white?: boolean }) => (
  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3" style={{ color: white ? BRAND.white : BRAND.charcoal }}>{children}</h2>
);

const SubText = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) => (
  <p className={`text-sm md:text-base leading-relaxed max-w-3xl ${dark ? 'text-gray-300' : 'text-gray-500'}`}>{children}</p>
);

const Bullet = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) => (
  <div className="flex items-start gap-2.5">
    <CheckCircle2 className="w-4 h-4 md:w-[18px] md:h-[18px] mt-0.5 flex-shrink-0 text-green-500" />
    <span className={`text-sm leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{children}</span>
  </div>
);

const Divider = ({ dark = false }: { dark?: boolean }) => (
  <div className="w-full h-px my-1" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.06)' : BRAND.border }} />
);

/* ── Mobile Menu ── */
const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-72 z-50 p-6 flex flex-col"
          style={{ backgroundColor: BRAND.dark }}
        >
          <div className="flex justify-between items-center mb-8">
            <span className="text-white font-bold text-sm">Menu</span>
            <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex flex-col gap-1">
            {['Apresentação', 'Estrutura', 'Correios', 'JadLog', 'FLEX', 'Benefícios', 'Plataforma'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                onClick={onClose}
                className="text-sm font-semibold text-white/60 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5 transition-all"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="mt-auto">
            <a
              href="https://wa.me/5511911544095"
              target="_blank"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: BRAND.orange }}
            >
              <Send className="w-4 h-4" /> Fale Conosco
            </a>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const LookEnviosPage = () => {
  const { scrollYProgress } = useScroll();
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: BRAND.cream, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <motion.div className="fixed top-0 left-0 h-[3px] z-[60]" style={{ width: progressWidth, background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.orangeLight})` }} />

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: `${BRAND.charcoal}F2`, borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-14">
          <img src={lookLogoDark} alt="Look Envios" className="h-10 md:h-16" />
          <div className="hidden md:flex items-center gap-6">
            {['Apresentação', 'Estrutura', 'Correios', 'JadLog', 'FLEX', 'Benefícios', 'Plataforma'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} className="text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="https://wa.me/5511911544095" target="_blank" className="text-xs font-bold px-4 py-1.5 rounded-full transition-all hover:scale-105 text-white hidden sm:block" style={{ backgroundColor: BRAND.orange }}>Fale Conosco</a>
            <button onClick={() => setMenuOpen(true)} className="md:hidden text-white/70 hover:text-white p-1">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. CAPA / HERO                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="apresentacao" className="relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="absolute inset-0">
          <motion.div className="absolute -top-20 -right-20 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${BRAND.orange}12, transparent 70%)` }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="absolute -bottom-40 -left-40 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full" style={{ background: `radial-gradient(circle, ${BRAND.orange}08, transparent 70%)` }} animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 12, repeat: Infinity }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-6 py-16 md:py-24">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 mb-6 md:mb-8">
            <FileText className="w-4 h-4" style={{ color: BRAND.orange }} />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[.2em]" style={{ color: BRAND.orange }}>Proposta Comercial 2026</span>
          </motion.div>

          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span className="text-xs md:text-sm font-semibold text-white/40 tracking-wider">BRHUB</span>
            <span className="text-[10px] md:text-xs font-medium text-white/20">em parceria com</span>
            <span className="text-xs md:text-sm font-semibold text-white/60 tracking-wider">FLEX ENVIOS</span>
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white/20" />
            <span className="text-xs md:text-sm font-semibold tracking-wider" style={{ color: BRAND.orange }}>LOOKCHINA</span>
          </motion.div>

          <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-5 md:mb-6 leading-[1.05]">
            LOOK <span style={{ color: BRAND.orange }}>ENVIOS</span>
          </motion.h1>

          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-2xl mb-8 md:mb-10">
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              A <strong className="text-white">BRHUB</strong>, em parceria com a <strong className="text-white">FLEX Envios</strong>, apresenta à <strong style={{ color: BRAND.orange }}>LookChina</strong> a proposta para estruturação da operação logística da marca sob a identidade LOOK ENVIOS — uma frente própria de expedição, frete e gestão de entregas, com posicionamento profissional, escalável e alinhado ao crescimento da operação.
            </p>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-2 md:gap-3">
            {[
              { icon: Package, label: 'Correios Diamante' },
              { icon: Truck, label: 'JadLog Ouro' },
              { icon: Zap, label: 'Envios Flex' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-semibold text-white/80 border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <t.icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: BRAND.orange }} /> {t.label}
              </span>
            ))}
          </motion.div>

          {/* Mobile CTA */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 sm:hidden">
            <a href="https://wa.me/5511911544095" target="_blank" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white shadow-lg" style={{ backgroundColor: BRAND.orange }}>
              <Send className="w-4 h-4" /> Falar com Consultor
            </a>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}><ChevronDown className="w-5 h-5 text-white/20" /></motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. OBJETIVO DO PROJETO                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.cream }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={2} />
          <Heading>Objetivo do <span style={{ color: BRAND.orange }}>Projeto</span></Heading>
          <SubText>O projeto LOOK ENVIOS tem como objetivo entregar à LookChina uma operação logística completa, com capacidade de atender diferentes perfis de pedidos, faixas de peso e necessidades de prazo.</SubText>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-10">
            {[
              { icon: Star, title: 'Identidade Própria', desc: 'Identidade logística própria da marca, reforçando presença em cada envio.' },
              { icon: Shield, title: 'Mais Controle', desc: 'Visibilidade total da operação, do despacho à entrega.' },
              { icon: TrendingUp, title: 'Competitividade', desc: 'Maior competitividade no frete com tabelas exclusivas.' },
              { icon: Globe, title: 'Cobertura Ampliada', desc: 'Cobertura operacional ampliada para todo o território nacional.' },
              { icon: Zap, title: 'Velocidade', desc: 'Mais velocidade na expedição, da emissão à entrega.' },
              { icon: Rocket, title: 'Pronto para Crescer', desc: 'Base preparada para crescimento e evolução com modelo Full.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}
                className="rounded-xl p-4 md:p-5 border transition-all hover:shadow-sm" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                <item.icon className="w-5 h-5 mb-2 md:mb-3" style={{ color: BRAND.orange }} />
                <h3 className="text-xs md:text-sm font-bold mb-1" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed hidden sm:block">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. CRIAÇÃO DA OPERAÇÃO                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={3} />
          <Heading>Criação da <span style={{ color: BRAND.orange }}>LOOK ENVIOS</span></Heading>

          <div className="grid md:grid-cols-2 gap-8 md:gap-14 mt-8 md:mt-10 items-start">
            <div className="space-y-4 md:space-y-5">
              <p className="text-gray-600 leading-relaxed text-sm">
                A LOOK ENVIOS será apresentada ao mercado como a <strong>operação logística oficial da LookChina</strong>, desenvolvida pela <strong>BRHUB em parceria com a FLEX Envios</strong>, fortalecendo a percepção de estrutura, profissionalismo e organização da marca.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm">
                Todas as etiquetas de envio seguirão com a identidade LOOK ENVIOS, utilizando o logo da operação, o que agrega valor à apresentação logística e fortalece o branding na expedição.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm hidden md:block">
                A logística deixa de ser apenas uma etapa operacional e passa a fazer parte da <strong>construção da marca</strong>, transmitindo ao cliente final mais segurança, consistência e profissionalismo.
              </p>
            </div>
            <div className="rounded-xl border p-5 md:p-6 space-y-3 md:space-y-4" style={{ borderColor: BRAND.border, backgroundColor: BRAND.cream }}>
              <div className="flex items-center gap-3 border-b pb-3 md:pb-4" style={{ borderColor: BRAND.border }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND.orange }}><Package className="w-4 h-4 text-white" /></div>
                <div><div className="font-bold text-sm" style={{ color: BRAND.charcoal }}>Etiqueta LOOK ENVIOS</div><div className="text-xs text-gray-400">Identidade própria em cada envio</div></div>
              </div>
              {[
                { icon: Award, label: 'Profissionalismo' },
                { icon: Layers, label: 'Identidade de Marca' },
                { icon: Shield, label: 'Segurança ao Cliente' },
                { icon: BadgeCheck, label: 'Consistência Visual' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <s.icon className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium" style={{ color: BRAND.charcoal }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. ESTRUTURA LOGÍSTICA                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="estrutura" className="py-12 md:py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={4} dark />
          <Heading white>Estrutura Logística <span style={{ color: BRAND.orange }}>Proposta</span></Heading>
          <SubText dark>A LOOK ENVIOS operará com três modalidades complementares, cada uma com papel estratégico dentro da operação.</SubText>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mt-8 md:mt-10">
            {[
              { icon: Package, name: 'Correios', tag: 'Diamante', highlight: 'Cobertura nacional', desc: 'Tabela Diamante exclusiva. Capilaridade e preço competitivo para envios leves e médios.' },
              { icon: Truck, name: 'JadLog', tag: 'Ouro', highlight: 'Remessas maiores', desc: 'Tabela Ouro para cargas acima de 30kg. Preços agressivos e +500 pontos de coleta.' },
              { icon: Zap, name: 'Envios Flex', tag: 'Same Day', highlight: 'Velocidade local', desc: 'Entregas no mesmo dia na Grande São Paulo. Tarifa fixa, filtragem por CEP.' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-xl p-5 border relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold text-white rounded-bl-lg" style={{ backgroundColor: BRAND.orange }}>{t.tag}</div>
                <t.icon className="w-7 h-7 md:w-8 md:h-8 mb-3" style={{ color: BRAND.orange }} />
                <h3 className="text-base md:text-lg font-bold text-white mb-1">{t.name}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 md:mb-3" style={{ color: BRAND.orangeLight }}>{t.highlight}</p>
                <p className="text-gray-300 text-xs leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. CORREIOS                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="correios" className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={5} />
          <Heading>Correios — <span style={{ color: BRAND.orange }}>Tabela Diamante</span></Heading>
          <SubText>Principal base de cobertura nacional da LOOK ENVIOS, com forte capilaridade e excelente aderência para remessas leves e médias.</SubText>

          {/* Stats first on mobile for impact */}
          <div className="grid grid-cols-2 gap-3 mt-8 md:hidden">
            {[
              { value: 'Até 85%', label: 'Economia vs. Balcão', icon: TrendingUp },
              { value: 'R$ 6,90', label: 'A partir de (SP)', icon: Target },
              { value: '100%', label: 'Cobertura Nacional', icon: Globe },
              { value: '30kg', label: 'Peso Máximo', icon: Weight },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl p-3 border text-center" style={{ borderColor: BRAND.border, backgroundColor: BRAND.cream }}>
                <stat.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: BRAND.orange }} />
                <div className="text-lg font-black" style={{ color: BRAND.orange }}>{stat.value}</div>
                <div className="text-[9px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-14 mt-6 md:mt-10 items-start">
            <div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5 md:mb-6">
                O grande destaque é a <strong>Tabela Diamante</strong>, uma condição comercial extremamente competitiva. A combinação entre capilaridade nacional e condição diferenciada faz dos Correios uma frente fundamental para sustentar o crescimento.
              </p>
              <div className="space-y-2 md:space-y-2.5">
                {[
                  'Forte abrangência nacional',
                  'Alta capilaridade em todo o Brasil',
                  'Excelente para envios leves e médios',
                  'Condição diferenciada — Tabela Diamante',
                  'Competitividade de preço',
                  'Sustentação em escala nacional',
                ].map((item, i) => <Bullet key={i}>{item}</Bullet>)}
              </div>
            </div>
            {/* Desktop stats */}
            <div className="hidden md:grid grid-cols-2 gap-3">
              {[
                { value: 'Até 85%', label: 'Economia vs. Balcão', icon: TrendingUp },
                { value: 'R$ 6,90', label: 'A partir de (SP)', icon: Target },
                { value: '100%', label: 'Cobertura Nacional', icon: Globe },
                { value: '30kg', label: 'Peso Máximo', icon: Weight },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-4 border text-center" style={{ borderColor: BRAND.border, backgroundColor: BRAND.cream }}>
                  <stat.icon className="w-4 h-4 mx-auto mb-2" style={{ color: BRAND.orange }} />
                  <div className="text-xl font-black" style={{ color: BRAND.orange }}>{stat.value}</div>
                  <div className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. JADLOG                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="jadlog" className="py-12 md:py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={6} dark />
          <Heading white>JadLog — <span style={{ color: BRAND.orange }}>Tabela Ouro</span></Heading>
          <SubText dark>Utilização estratégica para envios de maior porte, com foco em pacotes acima de 30kg e preços agressivos via Tabela Ouro.</SubText>

          <div className="grid md:grid-cols-2 gap-8 md:gap-14 mt-8 md:mt-10 items-start">
            <div>
              <p className="text-gray-300 text-sm leading-relaxed mb-5 md:mb-6">
                A JadLog complementa a malha logística com flexibilidade para mercadorias com maior peso. A <strong className="text-white">Tabela Ouro</strong> posiciona a modalidade com preços agressivos, fortalecendo a proposta da LOOK ENVIOS.
              </p>
              <div className="space-y-2 md:space-y-2.5">
                {[
                  'Foco em pacotes acima de 30kg',
                  'Alternativa robusta para remessas maiores',
                  'Capilaridade logística com +500 pontos',
                  'Composição comercial estratégica',
                  'Tabela Ouro como destaque da modalidade',
                  'Preços agressivos para cargas de maior peso',
                ].map((item, i) => <Bullet key={i} dark>{item}</Bullet>)}
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 md:gap-3">
              {[
                { icon: Weight, title: 'Até 150kg', desc: 'Peso máximo (coleta)' },
                { icon: Ruler, title: 'Até 140cm', desc: 'Dimensão máxima' },
                { icon: MapPinned, title: '+500 Pontos', desc: 'Rede de coleta' },
                { icon: Clock, title: '2 a 8 dias', desc: 'Prazo útil' },
                { icon: Truck, title: '.Package', desc: 'Exclusivo e-commerce' },
                { icon: Globe, title: 'Nacional', desc: 'Todas capitais' },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-3 md:p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5 mb-1.5 md:mb-2" style={{ color: BRAND.orange }} />
                  <h4 className="text-[10px] md:text-xs font-bold text-white">{item.title}</h4>
                  <p className="text-[9px] md:text-[10px] text-gray-400 hidden sm:block">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* When to use */}
          <div className="mt-8 md:mt-12 rounded-xl border p-4 md:p-6" style={{ backgroundColor: 'rgba(242,101,34,0.05)', borderColor: `${BRAND.orange}20` }}>
            <h3 className="text-sm md:text-base font-bold text-white mb-4 md:mb-5 flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color: BRAND.orange }} /> Quando usar JadLog vs. Correios?</h3>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2 md:space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 mb-2 md:mb-3" style={{ color: BRAND.orange }}><Crosshair className="w-3.5 h-3.5" /> Ideal para</h4>
                {['Volumes acima de 30kg', 'Dimensões superiores a 100cm', 'Rotas Sul/Sudeste com melhor custo-benefício', 'Coleta programada para alto volume', 'Produtos frágeis ou manuseio especial', 'E-commerce com envios diários'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /><span className="text-gray-200 text-xs">{item}</span></div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 mb-2 md:mb-3" style={{ color: BRAND.orangeLight }}><BarChart3 className="w-3.5 h-3.5" /> Especificações Técnicas</h4>
                {[
                  { label: 'Peso máximo (coleta)', value: '150 kg' },
                  { label: 'Peso máximo (ponto)', value: '30 kg' },
                  { label: 'Dimensão máxima', value: '140 cm' },
                  { label: 'Soma C+L+A', value: '240 cm' },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-gray-300 text-xs">{spec.label}</span>
                    <span className="text-white font-bold text-xs">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. ENVIOS FLEX                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="flex" className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={7} />
          <Heading>Envios Flex — <span style={{ color: BRAND.orange }}>Same Day</span></Heading>
          <SubText>Entregas rápidas no mesmo dia na Grande São Paulo, essenciais para urgência e diferencial competitivo.</SubText>

          <div className="grid grid-cols-3 gap-2 md:gap-4 mt-8 md:mt-10 mb-8 md:mb-12">
            {[
              { value: 'R$ 18', label: 'Tarifa Fixa', sub: 'Grande São Paulo', icon: Target },
              { value: 'D+0', label: 'Same Day', sub: 'Pedidos até 12h', icon: Zap },
              { value: 'CEP', label: 'Filtragem', sub: 'Cobertura inteligente', icon: Navigation },
            ].map((card, i) => (
              <div key={i} className="rounded-xl p-3 md:p-6 border text-center" style={{ borderColor: BRAND.border, backgroundColor: BRAND.cream }}>
                <card.icon className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-2 md:mb-3" style={{ color: BRAND.orange }} />
                <div className="text-xl md:text-3xl font-black mb-0.5 md:mb-1" style={{ color: BRAND.orange }}>{card.value}</div>
                <div className="text-[10px] md:text-sm font-bold" style={{ color: BRAND.charcoal }}>{card.label}</div>
                <div className="text-gray-400 text-[9px] md:text-xs mt-0.5 md:mt-1 hidden sm:block">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-start">
            <div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5 md:mb-6">
                Os Envios Flex posicionam a LookChina com uma operação moderna e dinâmica, permitindo entregas no mesmo dia com conveniência e agilidade na região metropolitana de São Paulo.
              </p>
              <div className="space-y-2 md:space-y-2.5">
                {[
                  'Entregas rápidas no mesmo dia',
                  'Foco na Grande São Paulo',
                  'Aumento da velocidade operacional',
                  'Melhoria da experiência do cliente final',
                  'Fortalecimento da competitividade local',
                  'Filtragem automática por CEP de cobertura',
                ].map((item, i) => <Bullet key={i}>{item}</Bullet>)}
              </div>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BRAND.border }}>
              <div className="px-4 py-2 md:py-2.5 font-bold text-[10px] md:text-xs text-white tracking-wider uppercase" style={{ backgroundColor: BRAND.orange }}>Cobertura FLEX — Grande São Paulo</div>
              <div className="p-3 md:p-4 space-y-1 md:space-y-1.5" style={{ backgroundColor: BRAND.cream }}>
                {[
                  { regiao: 'Capital SP', ceps: '01000 a 05999' },
                  { regiao: 'Zona Leste', ceps: '08000 a 08499' },
                  { regiao: 'Zona Sul', ceps: '04000 a 04999' },
                  { regiao: 'ABCDM', ceps: '09000 a 09999' },
                  { regiao: 'Guarulhos', ceps: '07000 a 07399' },
                  { regiao: 'Osasco', ceps: '06000 a 06299' },
                  { regiao: 'Barueri', ceps: '06300 a 06499' },
                  { regiao: 'Taboão/Embu', ceps: '06700 a 06899' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-2.5 md:px-3 py-1.5 md:py-2 border" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] md:text-xs" style={{ color: BRAND.charcoal }}>{r.regiao}</span>
                      <span className="text-gray-400 text-[8px] md:text-[10px] hidden sm:inline">{r.ceps}</span>
                    </div>
                    <CircleDot className="w-3 h-3 md:w-4 md:h-4 text-green-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 8. ABRANGÊNCIA TOTAL                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.cream }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={8} />
          <Heading>Abrangência <span style={{ color: BRAND.orange }}>Total</span></Heading>
          <SubText>Cada pedido segue pelo canal mais adequado de acordo com peso, prazo e destino.</SubText>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mt-8 md:mt-10">
            {[
              { icon: Globe, title: 'Cobertura Nacional', desc: 'Com os Correios, alcance a todos os CEPs do Brasil com preço competitivo.', color: '#2563EB' },
              { icon: Truck, title: 'Cargas Maiores', desc: 'Com a JadLog, remessas acima de 30kg com capilaridade e preço agressivo.', color: '#7C3AED' },
              { icon: Zap, title: 'Velocidade Local', desc: 'Com Envios Flex, entregas no mesmo dia na Grande São Paulo.', color: '#16A34A' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-xl p-5 md:p-6 border flex sm:flex-col sm:text-center items-center sm:items-center gap-4 sm:gap-0" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 sm:mx-auto sm:mb-4" style={{ backgroundColor: `${item.color}10` }}>
                  <item.icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: item.color }} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold mb-1 md:mb-2" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 9. BENEFÍCIOS ESTRATÉGICOS                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="beneficios" className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={9} />
          <Heading>Benefícios para a <span style={{ color: BRAND.orange }}>LookChina</span></Heading>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-8 md:mt-10">
            {[
              { icon: Star, title: 'Fortalecimento da Marca', desc: 'Etiquetas com identidade LOOK ENVIOS agregam profissionalismo.' },
              { icon: TrendingUp, title: 'Competitividade no Frete', desc: 'Múltiplas modalidades trazem flexibilidade de preço e prazo.' },
              { icon: Users, title: 'Melhor Experiência', desc: 'Entrega nacional, remessas maiores e same day.' },
              { icon: Rocket, title: 'Pronto para Crescer', desc: 'Base escalável para expansão de volume.' },
              { icon: Cpu, title: 'Inteligência Operacional', desc: 'Cada modalidade com papel específico e claro.' },
              { icon: Globe, title: 'Ampliação de Cobertura', desc: 'Remessas locais, nacionais e de maior porte.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 2) * 0.08 }}
                className="rounded-xl p-4 md:p-5 border flex gap-3 md:gap-4 items-start" style={{ borderColor: BRAND.border, backgroundColor: BRAND.cream }}>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: BRAND.orange }} />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold mb-0.5 md:mb-1" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                  <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 10. BRANDING                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.cream }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={10} />
          <Heading>Branding: <span style={{ color: BRAND.orange }}>Sua Marca em Cada Pacote</span></Heading>
          <SubText>Etiquetas personalizadas e interface unificada reforçando a identidade LOOK ENVIOS em cada envio.</SubText>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mt-8 items-start">
            <div className="space-y-4 md:space-y-5">
              <div className="rounded-xl p-5 md:p-6 border" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 md:mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <FileText className="w-5 h-5" style={{ color: BRAND.orange }} />
                </div>
                <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2" style={{ color: BRAND.charcoal }}>Etiquetas Personalizadas</h3>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed">Todas as etiquetas carregam a logomarca LOOK Envios, criando percepção de marca corporativa sólida.</p>
              </div>
              <div className="rounded-xl p-5 md:p-6 border" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 md:mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <Layers className="w-5 h-5" style={{ color: BRAND.orange }} />
                </div>
                <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2" style={{ color: BRAND.charcoal }}>Interface Unificada</h3>
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed">Painéis com identidade visual vibrante (Laranja e Branco) reforçando segurança e modernidade.</p>
              </div>
            </div>
            <div className="rounded-2xl border p-5 md:p-6 shadow-lg" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border, borderLeft: `3px solid ${BRAND.orange}` }}>
              <div className="flex items-center gap-3 mb-5 md:mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND.orange }}>
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: BRAND.charcoal }}>Etiqueta #LK20260318</div>
                  <div className="text-xs text-gray-400">PAC • Look Envios</div>
                </div>
                <div className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: BRAND.orange }} />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Objeto Postado', active: false, done: true },
                  { label: 'Em Trânsito', active: true, done: false },
                  { label: 'Saiu para Entrega', active: false, done: false },
                  { label: 'Entregue', active: false, done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${step.active ? '' : step.done ? 'bg-gray-300' : 'bg-gray-200'}`} style={step.active ? { backgroundColor: BRAND.orange } : {}} />
                    <span className={`text-sm ${step.active ? 'font-bold' : 'text-gray-400'}`} style={step.active ? { color: BRAND.orange } : {}}>
                      {step.label}
                    </span>
                    {step.active && <Truck className="w-4 h-4" style={{ color: BRAND.orange }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 11. FUNCIONALIDADES DA PLATAFORMA                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="plataforma" className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={11} />
          <Heading>Funcionalidades da <span style={{ color: BRAND.orange }}>Plataforma</span></Heading>
          <SubText>Todos os recursos para uma operação logística completa e profissional.</SubText>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5 mt-8">
            {[
              { icon: Printer, title: 'Emissão de Etiquetas', desc: 'Individual com branding personalizado.' },
              { icon: BarChart3, title: 'Simulador de Frete', desc: 'Compare transportadoras em tempo real.' },
              { icon: MapPin, title: 'Rastreamento', desc: 'Mapa interativo com alertas.' },
              { icon: Bot, title: 'CRM com IA', desc: 'Múltiplos canais WhatsApp.' },
              { icon: Bell, title: 'Notificações', desc: 'HSM em cada etapa.' },
              { icon: Receipt, title: 'Faturas', desc: 'PDF, boletos, controle.' },
              { icon: UsersRound, title: 'Multi-Remetentes', desc: 'Sync automática.' },
              { icon: BarChart, title: 'Relatórios', desc: 'KPIs por UF e serviço.' },
              { icon: ShieldCheck, title: 'Segurança', desc: 'Criptografia e auditoria.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }}
                className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ backgroundColor: BRAND.cream, borderColor: BRAND.border }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center mb-2.5 md:mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: BRAND.orange }} />
                </div>
                <h3 className="text-xs md:text-base font-bold mb-0.5 md:mb-1" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                <p className="text-gray-500 text-[10px] md:text-sm hidden sm:block">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 12. ATENDIMENTO INTELIGENTE                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={12} dark />
          <Heading white>Atendimento Inteligente e <span style={{ color: BRAND.orange }}>Suporte com IA</span></Heading>
          <SubText dark>Powered by BRHUB Conecta — IA treinada, triagem inteligente e automação multicanal.</SubText>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5 mt-8">
            {[
              { icon: Bot, title: 'Assistentes IA (24/7)', desc: 'IA treinada para dúvidas sobre prazos, status e troca.' },
              { icon: Activity, title: 'Triagem Inteligente', desc: 'Resolve problemas simples, escala casos complexos.' },
              { icon: MessageSquare, title: 'Automação', desc: 'Respostas automatizadas sobre rastreamento.' },
              { icon: Bell, title: 'Rastreamento WhatsApp', desc: 'Alertas: Postado, Em Trânsito, Entregue.' },
              { icon: Shield, title: 'Alertas de Exceção', desc: 'Identificação proativa de atrasos.' },
              { icon: Headphones, title: 'Gestão de Protocolos', desc: 'Canais centralizados em interface única.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }}
                className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <item.icon className="w-5 h-5 md:w-7 md:h-7 mb-2.5 md:mb-4" style={{ color: BRAND.orange }} />
                <h3 className="text-xs md:text-base font-bold text-white mb-0.5 md:mb-1">{item.title}</h3>
                <p className="text-gray-300 text-[10px] md:text-sm leading-relaxed hidden sm:block">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 13. INTELIGÊNCIA FINANCEIRA                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={13} />
          <Heading>Inteligência <span style={{ color: BRAND.orange }}>Financeira</span></Heading>
          <SubText>Split de pagamento e política de faturamento para gestão profissional.</SubText>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-8 mt-8">
            <div className="rounded-xl md:rounded-2xl p-5 md:p-8 border" style={{ backgroundColor: BRAND.cream, borderColor: BRAND.border }}>
              <CreditCard className="w-6 h-6 md:w-7 md:h-7 mb-3 md:mb-4" style={{ color: BRAND.orange }} />
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-5" style={{ color: BRAND.charcoal }}>Split de Pagamento</h3>
              <div className="space-y-2.5 md:space-y-3">
                <Bullet>Repasse Direto: componente do frete segregado automaticamente.</Bullet>
                <Bullet>Liquidez Operacional: recursos sempre disponíveis.</Bullet>
              </div>
            </div>
            <div className="rounded-xl md:rounded-2xl p-5 md:p-8 border" style={{ backgroundColor: BRAND.cream, borderColor: BRAND.border }}>
              <Receipt className="w-6 h-6 md:w-7 md:h-7 mb-3 md:mb-4" style={{ color: BRAND.orange }} />
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-5" style={{ color: BRAND.charcoal }}>Política de Faturamento</h3>
              <div className="space-y-2.5 md:space-y-3">
                <Bullet>Vendas Externas: faturas detalhadas para gestão profissional.</Bullet>
                <Bullet>Marketplace: atua apenas como emissor e rastreador.</Bullet>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 14. ESPECIFICAÇÕES TÉCNICAS                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.cream }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={14} />
          <Heading>Especificações <span style={{ color: BRAND.orange }}>Técnicas</span></Heading>
          <SubText>Infraestrutura robusta com API RESTful, webhooks em tempo real e alta disponibilidade.</SubText>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-8">
            {[
              { icon: Server, title: 'API RESTful', desc: 'JSON + Swagger' },
              { icon: Webhook, title: 'Webhooks', desc: 'Tempo real' },
              { icon: FileCode, title: 'Etiquetas', desc: 'PDF e ZPL' },
              { icon: Lock, title: 'Segurança', desc: 'OAuth2 + criptografia' },
              { icon: Activity, title: 'SLA 99.9%', desc: 'Alta disponibilidade' },
              { icon: GitBranch, title: 'Ambientes', desc: 'Staging + Prod' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-3 md:p-4 border flex items-center gap-2.5 md:gap-3" style={{ backgroundColor: BRAND.white, borderColor: BRAND.border }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: BRAND.orange }} />
                </div>
                <div>
                  <h4 className="text-[10px] md:text-sm font-bold" style={{ color: BRAND.charcoal }}>{item.title}</h4>
                  <p className="text-gray-400 text-[9px] md:text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 15. ARQUITETURA TÉCNICA                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.white }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={15} />
          <Heading>Arquitetura <span style={{ color: BRAND.orange }}>Look China</span></Heading>
          <SubText>Infraestrutura de alta disponibilidade para emissões em massa e rastreamento.</SubText>
          <div className="rounded-xl md:rounded-2xl border overflow-hidden shadow-lg mt-8 md:mt-10" style={{ borderColor: BRAND.border }}>
            <img src={arquiteturaImg} alt="Arquitetura Técnica do Hub de Logística Look Envios" className="w-full" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 16. CRONOGRAMA DE ENTREGA                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.cream }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={16} />
          <Heading>Cronograma de <span style={{ color: BRAND.orange }}>Entrega</span></Heading>
          <SubText>Fases de implementação da operação LOOK ENVIOS.</SubText>

          <div className="max-w-lg mx-auto space-y-0 mt-8 md:mt-10">
            {[
              { icon: FileText, phase: 'FASE 1', title: 'Assinatura de Contrato', desc: 'Vigência mínima de 24 meses.', color: BRAND.orange },
              { icon: Cpu, phase: 'FASE 2', title: 'Desenvolvimento da Plataforma', desc: 'Construção e personalização do ambiente LOOK ENVIOS.', color: BRAND.orange },
              { icon: GitBranch, phase: 'FASE 3', title: 'Integrações com Gateways', desc: 'Conexão com gateways das transportadoras.', color: BRAND.orange },
              { icon: UsersRound, phase: 'FASE 4', title: 'Treinamento', desc: 'Capacitação da equipe para uso da plataforma.', color: BRAND.orange },
              { icon: Bot, phase: 'FASE 5', title: 'Criação de IA e BackOffice', desc: 'Preparação da IA e backoffice de atendimento.', color: BRAND.orange },
              { icon: ScanLine, phase: 'FASE 6', title: 'Integração e Testes', desc: 'API, notificações multicanal e validação completa.', color: BRAND.orange },
              { icon: Flag, phase: 'FASE 7', title: 'Lançamento Oficial', desc: 'Go-Live da plataforma LOOK ENVIOS.', color: '#16A34A' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 md:gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: step.color }}>
                    <step.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  {i < 6 && <div className="w-0.5 h-10 md:h-16" style={{ backgroundColor: `${BRAND.orange}30` }} />}
                </div>
                <div className="pt-0.5 md:pt-1 pb-4 md:pb-8">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: BRAND.orange }}>{step.phase}</span>
                  <h3 className="text-base md:text-xl font-bold mt-0.5 md:mt-1" style={{ color: BRAND.charcoal }}>{step.title}</h3>
                  <p className="text-gray-500 text-xs md:text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 17. FASE 2 — FULL                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6">
          <SectionNumber n={17} dark />
          <Heading white>Fase 2 — Operação <span style={{ color: BRAND.orange }}>Full</span></Heading>
          <SubText dark>Uma oportunidade estratégica para a evolução do projeto: fulfillment com armazenagem em galpão, maior controle e velocidade.</SubText>

          <div className="grid md:grid-cols-2 gap-8 md:gap-14 mt-8 md:mt-10 items-start">
            <div className="rounded-xl p-5 md:p-6 border" style={{ background: `linear-gradient(135deg, rgba(242,101,34,0.06), rgba(242,101,34,0.02))`, borderColor: `${BRAND.orange}15` }}>
              <Warehouse className="w-10 h-10 md:w-12 md:h-12 mb-4 md:mb-5" style={{ color: BRAND.orange }} />
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Fulfillment Completo</h3>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                Os produtos poderão ser armazenados em galpão, permitindo que a operação ganhe eficiência, organização e velocidade. A LOOK ENVIOS incorpora uma lógica completa de fulfillment.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-3 md:mb-4">A operação Full possibilita:</h3>
              <div className="space-y-2 md:space-y-2.5">
                {[
                  'Armazenagem estruturada dos itens',
                  'Maior controle de estoque',
                  'Mais agilidade na separação de pedidos',
                  'Aceleração do processo de expedição',
                  'Ganho de eficiência operacional',
                  'Melhoria no prazo de despacho',
                  'Base para crescimento com maior escala',
                ].map((item, i) => <Bullet key={i} dark>{item}</Bullet>)}
              </div>
              <div className="mt-5 md:mt-6 rounded-lg p-3 md:p-4 border" style={{ backgroundColor: `${BRAND.orange}08`, borderColor: `${BRAND.orange}15` }}>
                <p className="text-[10px] md:text-xs font-medium" style={{ color: BRAND.orangeLight }}>Os valores da operação Full serão apresentados em proposta comercial separada, específica para a segunda fase.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CONCLUSÃO / CTA                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="contato" className="py-16 md:py-24" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-3xl mx-auto px-5 md:px-6 text-center">
          <SectionNumber n={18} dark />
          <img src={lookLogoDark} alt="Look Envios" className="h-20 md:h-32 mx-auto mb-5 md:mb-6" />
          <Heading white>Uma proposta sólida para o <span style={{ color: BRAND.orange }}>futuro</span></Heading>
          <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-3 md:mb-4 max-w-2xl mx-auto">
            A <strong>BRHUB</strong>, em parceria com a <strong>FLEX Envios</strong>, apresenta à LookChina uma proposta para criação da LOOK ENVIOS — transformando a logística em uma operação mais profissional, estratégica e preparada para crescer.
          </p>
          <p className="text-gray-400 text-[10px] md:text-xs leading-relaxed mb-8 md:mb-10 max-w-2xl mx-auto">
            Etiquetas com logo LOOK ENVIOS, operação com Correios, JadLog e Envios Flex, malha logística completa com cobertura nacional, força regional e alta competitividade.
          </p>

          <div className="flex justify-center gap-2 md:gap-3 mb-8 md:mb-10">
            {[
              { icon: Package, label: 'Correios' },
              { icon: Truck, label: 'JadLog' },
              { icon: Zap, label: 'Flex' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg p-2.5 md:p-3 border" style={{ backgroundColor: 'rgba(242,101,34,0.06)', borderColor: `${BRAND.orange}15` }}>
                <item.icon className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" style={{ color: BRAND.orange }} />
                <div className="text-[9px] md:text-[10px] font-bold text-white">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <motion.a href="https://wa.me/5511911544095" target="_blank" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg text-white w-full sm:w-auto justify-center" style={{ backgroundColor: BRAND.orange }}><Send className="w-4 h-4" /> Falar com Consultor</motion.a>
          </div>
          <p className="text-gray-600 text-[10px] md:text-xs mt-6 md:mt-8">www.lookchina.com.br</p>
        </div>
      </section>

      <footer className="py-3 md:py-4 text-center" style={{ backgroundColor: BRAND.dark }}>
        <p className="text-gray-600 text-[9px] md:text-[10px] tracking-wider uppercase">© 2026 Look Envios — Powered by BRHUB & FLEX Envios</p>
      </footer>
    </div>
  );
};

export default LookEnviosPage;
