import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Package, Truck, Shield, Zap, Globe, Cpu, CheckCircle2, Gem,
  TrendingUp, Users, Mail, Send, ChevronDown,
  Target, Clock, Ruler, Weight, MapPinned, AlertCircle,
  Warehouse, ArrowRight, Star, Rocket
} from 'lucide-react';
import lookLogo from '@/assets/look-china-logo-official.svg';

const BRAND = { orange: '#F26522', orangeLight: '#F7941D', orangeDark: '#D4541E', charcoal: '#333333', dark: '#1A1A1A', lightGray: '#F5F5F5', white: '#FFFFFF' };

const SectionBadge = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) => (
  <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4" style={{ backgroundColor: dark ? `${BRAND.orange}25` : `${BRAND.orange}15`, color: BRAND.orange }}>{children}</span>
);

const SectionTitle = ({ children, white = false }: { children: React.ReactNode; white?: boolean }) => (
  <h2 className="text-3xl md:text-5xl font-black mb-4" style={{ color: white ? BRAND.white : BRAND.charcoal }}>{children}</h2>
);

const BulletItem = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) => (
  <div className="flex items-start gap-3">
    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#22C55E' }} />
    <span className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{children}</span>
  </div>
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
            {['Apresentação', 'Estrutura', 'Correios', 'JadLog', 'FLEX', 'Benefícios', 'Tarifas'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} className="text-sm font-medium text-white/80 hover:text-white transition-colors">{item}</a>
            ))}
          </div>
          <a href="#contato" className="text-sm font-bold px-5 py-2 rounded-full border-2 transition-all hover:scale-105" style={{ borderColor: BRAND.orange, color: BRAND.orange }}>Fale Conosco</a>
        </div>
      </nav>

      {/* ═══════ 1. HERO / APRESENTAÇÃO ═══════ */}
      <section id="apresentacao" className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ backgroundColor: BRAND.charcoal }}>
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
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: `${BRAND.orange}20`, color: BRAND.orange }}>
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: BRAND.orange }} /><span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: BRAND.orange }} /></span>
            Proposta Comercial 2026
          </motion.div>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 mb-2">
            <span className="text-lg font-semibold text-white/60">BRHUB ENVIOS</span>
            <ArrowRight className="w-5 h-5 text-white/40" />
            <span className="text-lg font-semibold" style={{ color: BRAND.orange }}>LOOKCHINA</span>
          </motion.div>
          <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-5xl md:text-7xl font-black text-white mb-4 leading-[1.1]">
            LOOK <span style={{ color: BRAND.orange }}>ENVIOS</span>
          </motion.h1>
          <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-xl font-semibold mb-6" style={{ color: BRAND.orangeLight }}>
            Criação da operação logística Look Envios
          </motion.p>
          <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/60 text-base leading-relaxed mb-8 max-w-3xl">
            A BRHUB apresenta à LookChina esta proposta comercial para estruturação da operação logística da marca sob a identidade LOOK ENVIOS, criando uma frente própria de expedição, frete e gestão de entregas, com posicionamento profissional, escalável e alinhado ao crescimento da operação.
          </motion.p>
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-3">
            {[
              { icon: Package, label: 'Correios Diamante' },
              { icon: Truck, label: 'JadLog Ouro' },
              { icon: Zap, label: 'Envios Flex' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white border border-white/15" style={{ backgroundColor: `${BRAND.orange}${15 + i * 8}` }}>
                <t.icon className="w-4 h-4" /> {t.label}
              </span>
            ))}
          </motion.div>
        </div>
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}><ChevronDown className="w-6 h-6 text-white/30" /></motion.div>
      </section>

      {/* ═══════ 2. OBJETIVO DO PROJETO ═══════ */}
      <section className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge>SEÇÃO 2</SectionBadge>
            <SectionTitle>Objetivo do <span style={{ color: BRAND.orange }}>Projeto</span></SectionTitle>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">O projeto LOOK ENVIOS tem como objetivo entregar à LookChina uma operação logística completa, com capacidade de atender diferentes perfis de pedidos, diferentes faixas de peso e diferentes necessidades de prazo.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Star, title: 'Identidade Própria', desc: 'Identidade logística própria da marca, reforçando presença em cada envio.' },
              { icon: Shield, title: 'Mais Controle', desc: 'Mais controle sobre os envios com visibilidade total da operação.' },
              { icon: TrendingUp, title: 'Competitividade', desc: 'Maior competitividade no frete com tabelas exclusivas.' },
              { icon: Globe, title: 'Cobertura Ampliada', desc: 'Cobertura operacional ampliada para todo o território nacional.' },
              { icon: Zap, title: 'Velocidade', desc: 'Mais velocidade na expedição, desde a emissão até a entrega.' },
              { icon: Rocket, title: 'Pronto para Crescer', desc: 'Estrutura preparada para crescimento e evolução com modelo Full.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <item.icon className="w-6 h-6" style={{ color: BRAND.orange }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 3. CRIAÇÃO DA OPERAÇÃO ═══════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge>SEÇÃO 3</SectionBadge>
            <SectionTitle>Criação da <span style={{ color: BRAND.orange }}>LOOK ENVIOS</span></SectionTitle>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                A LOOK ENVIOS será apresentada ao mercado como a <strong>operação logística oficial da LookChina</strong>, fortalecendo a percepção de estrutura, profissionalismo e organização da marca.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Todas as etiquetas de envio seguirão com a identidade LOOK ENVIOS, utilizando o logo da operação, o que agrega valor à apresentação logística da empresa e fortalece o branding no processo de expedição.
              </p>
              <p className="text-gray-600 leading-relaxed">
                A logística deixa de ser apenas uma etapa operacional e passa a fazer parte da <strong>construção da marca</strong>, transmitindo ao cliente final mais segurança, mais consistência e mais profissionalismo em cada pedido enviado.
              </p>
            </motion.div>
            <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="rounded-3xl p-8 border" style={{ background: `linear-gradient(135deg, ${BRAND.orange}08, ${BRAND.orange}15)`, borderColor: `${BRAND.orange}30` }}>
                <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND.orange }}><Package className="w-5 h-5 text-white" /></div>
                    <div><div className="font-bold" style={{ color: BRAND.charcoal }}>Etiqueta LOOK ENVIOS</div><div className="text-xs text-gray-500">Identidade própria em cada envio</div></div>
                  </div>
                  {['Profissionalismo', 'Identidade de Marca', 'Segurança ao Cliente', 'Consistência Visual'].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
                      <span className="text-sm font-medium" style={{ color: BRAND.charcoal }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ 4. ESTRUTURA LOGÍSTICA ═══════ */}
      <section id="estrutura" className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-6">
            <SectionBadge dark>SEÇÃO 4</SectionBadge>
            <SectionTitle white>Estrutura Logística <span style={{ color: BRAND.orange }}>Proposta</span></SectionTitle>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">Para garantir cobertura ampla, competitividade comercial e eficiência operacional, a LOOK ENVIOS operará com três modalidades principais, cada uma com papel estratégico dentro da operação.</p>
          </motion.div>
          <p className="text-gray-500 text-center text-sm max-w-2xl mx-auto mb-12">Essa composição permite que a LookChina tenha uma malha logística completa — desde envios leves nacionais até entregas rápidas na Grande São Paulo e pacotes maiores com transportadora privada.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Package, name: 'Correios', desc: 'Alcance nacional, capilaridade e preço competitivo. Tabela Diamante exclusiva.', tag: 'Diamante', highlight: 'Principal base de cobertura nacional' },
              { icon: Truck, name: 'JadLog', desc: 'Pacotes maiores, capilaridade e preços agressivos. Tabela Ouro para cargas acima de 30kg.', tag: 'Ouro', highlight: 'Alternativa robusta para remessas maiores' },
              { icon: Zap, name: 'Envios Flex', desc: 'Entregas rápidas no mesmo dia na Grande São Paulo. Agilidade e conveniência.', tag: 'Same Day', highlight: 'Velocidade local e diferencial competitivo' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="rounded-2xl p-6 border relative overflow-hidden group hover:-translate-y-2 transition-transform" style={{ backgroundColor: `${BRAND.white}08`, borderColor: `${BRAND.white}10` }}>
                <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl" style={{ backgroundColor: BRAND.orange }}>{t.tag}</div>
                <t.icon className="w-12 h-12 mb-4" style={{ color: BRAND.orange }} />
                <h3 className="text-2xl font-bold text-white mb-2">{t.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: BRAND.orangeLight }}>{t.highlight}</p>
                <p className="text-gray-400 text-sm">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 5. CORREIOS ═══════ */}
      <section id="correios" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge><Package className="w-3 h-3 inline mr-1" /> SEÇÃO 5</SectionBadge>
            <SectionTitle>Correios — <span style={{ color: BRAND.orange }}>Tabela Diamante</span></SectionTitle>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">A operação com Correios será a principal base de cobertura nacional da LOOK ENVIOS, com forte capilaridade, ampla presença territorial e excelente aderência para remessas leves e médias.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed mb-6">
                O grande destaque dessa modalidade é a utilização da <strong>Tabela Diamante</strong>, que representa uma condição comercial extremamente competitiva e estratégica para a operação. A combinação entre capilaridade nacional e condição comercial diferenciada faz dos Correios uma frente fundamental.
              </p>
              <h3 className="text-lg font-bold mb-4" style={{ color: BRAND.charcoal }}>Destaques da operação</h3>
              <div className="space-y-3">
                {[
                  'Forte abrangência nacional',
                  'Alta capilaridade em todo o Brasil',
                  'Excelente aderência para envios leves e médios',
                  'Condição comercial diferenciada — Tabela Diamante',
                  'Competitividade de preço',
                  'Sustentação da operação em escala nacional',
                ].map((item, i) => <BulletItem key={i}>{item}</BulletItem>)}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { value: 'Até 85%', label: 'Economia vs. Balcão' },
                  { value: 'R$ 6,90', label: 'A partir de (SP)' },
                  { value: '100%', label: 'Cobertura Nacional' },
                  { value: '30kg', label: 'Peso Máximo' },
                ].map((stat, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.03 }} className="rounded-xl p-5 border text-center" style={{ background: `linear-gradient(135deg, ${BRAND.orange}08, ${BRAND.orange}03)`, borderColor: `${BRAND.orange}15` }}>
                    <div className="text-2xl font-black" style={{ color: BRAND.orange }}>{stat.value}</div>
                    <div className="text-xs font-semibold text-gray-500 mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 6. JADLOG ═══════ */}
      <section id="jadlog" className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge dark><Truck className="w-3 h-3 inline mr-1" /> SEÇÃO 6</SectionBadge>
            <SectionTitle white>JadLog — <span style={{ color: BRAND.orange }}>Tabela Ouro</span></SectionTitle>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">A JadLog será utilizada de forma estratégica para envios de maior porte, com foco em pacotes acima de 30kg, ampliando a capacidade da LOOK ENVIOS para remessas mais robustas.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
            <div className="space-y-4">
              <p className="text-gray-400 leading-relaxed mb-4">
                A JadLog entra no projeto como alternativa extremamente importante para complementar a malha logística, trazendo mais flexibilidade e melhor adequação para mercadorias com maior peso. A <strong className="text-white">Tabela Ouro</strong> posiciona essa modalidade com preços agressivos.
              </p>
              <h3 className="text-lg font-bold text-white mb-4">Destaques da operação</h3>
              <div className="space-y-3">
                {[
                  'Foco em pacotes acima de 30kg',
                  'Alternativa robusta para remessas maiores',
                  'Capilaridade logística com +500 pontos',
                  'Composição comercial estratégica',
                  'Tabela Ouro como destaque da modalidade',
                  'Preços agressivos para cargas de maior peso',
                ].map((item, i) => <BulletItem key={i} dark>{item}</BulletItem>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Weight, title: 'Até 150kg', desc: 'Peso máximo via coleta' },
                { icon: Ruler, title: 'Até 140cm', desc: 'Dimensão máxima individual' },
                { icon: MapPinned, title: '+500 Pontos', desc: 'Rede de coleta e postagem' },
                { icon: Clock, title: '2 a 8 dias', desc: 'Prazo útil de entrega' },
                { icon: Truck, title: '.Package', desc: 'Modalidade exclusiva e-commerce' },
                { icon: Globe, title: 'Nacional', desc: 'Todas as capitais e cidades' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="rounded-xl p-4 border" style={{ backgroundColor: `${BRAND.white}05`, borderColor: `${BRAND.white}10` }}>
                  <item.icon className="w-8 h-8 mb-2" style={{ color: BRAND.orange }} />
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl border p-8" style={{ backgroundColor: `${BRAND.orange}08`, borderColor: `${BRAND.orange}20` }}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><AlertCircle className="w-5 h-5" style={{ color: BRAND.orange }} /> Quando usar JadLog vs. Correios?</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND.orange }}>✅ Ideal para:</h4>
                {['Volumes acima de 30kg', 'Dimensões superiores a 100cm', 'Rotas Sul/Sudeste com melhor custo-benefício', 'Coleta programada para alto volume', 'Produtos frágeis ou manuseio especial', 'E-commerce com envios diários'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /><span className="text-gray-300 text-sm">{item}</span></div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-wider mb-3" style={{ color: BRAND.orangeLight }}>📊 Especificações Técnicas</h4>
                {[
                  { label: 'Peso máximo (coleta)', value: '150 kg' },
                  { label: 'Peso máximo (ponto)', value: '30 kg' },
                  { label: 'Dimensão máxima', value: '140 cm' },
                  { label: 'Soma C+L+A', value: '240 cm' },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center rounded-lg px-3 py-2" style={{ backgroundColor: `${BRAND.white}05` }}>
                    <span className="text-gray-400 text-sm">{spec.label}</span>
                    <span className="text-white font-bold text-sm">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ 7. ENVIOS FLEX ═══════ */}
      <section id="flex" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge><Zap className="w-3 h-3 inline mr-1" /> SEÇÃO 7</SectionBadge>
            <SectionTitle>Envios Flex — <span style={{ color: BRAND.orange }}>Same Day Grande SP</span></SectionTitle>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">Entregas rápidas no mesmo dia na Grande São Paulo. Essencial para atender pedidos com urgência e elevar o nível de serviço da operação.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { value: 'R$ 18', label: 'Tarifa Fixa', sub: 'Grande São Paulo' },
              { value: 'D+0', label: 'Same Day', sub: 'Pedidos até 12h' },
              { value: 'CEP', label: 'Filtragem Inteligente', sub: 'Apresenta só se atende' },
            ].map((card, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} className="rounded-2xl p-8 border text-center" style={{ background: `linear-gradient(135deg, ${BRAND.orange}10, ${BRAND.orange}05)`, borderColor: `${BRAND.orange}20` }}>
                <div className="text-5xl font-black mb-2" style={{ color: BRAND.orange }}>{card.value}</div>
                <div className="text-lg font-bold" style={{ color: BRAND.charcoal }}>{card.label}</div>
                <div className="text-gray-500 text-sm mt-1">{card.sub}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <p className="text-gray-600 leading-relaxed mb-6">
                Os Envios Flex permitirão que a LOOK ENVIOS realize entregas no mesmo dia, trazendo mais conveniência para o cliente e posicionando a LookChina com uma operação mais moderna e dinâmica.
              </p>
              <h3 className="text-lg font-bold mb-4" style={{ color: BRAND.charcoal }}>Destaques</h3>
              <div className="space-y-3">
                {[
                  'Entregas rápidas no mesmo dia',
                  'Foco na Grande São Paulo',
                  'Aumento da velocidade operacional',
                  'Melhoria da experiência do cliente final',
                  'Fortalecimento da competitividade local',
                  'Filtragem automática por CEP de cobertura',
                ].map((item, i) => <BulletItem key={i}>{item}</BulletItem>)}
              </div>
            </motion.div>
            <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: BRAND.lightGray }}>
                <div className="px-5 py-3 font-bold text-sm text-white" style={{ backgroundColor: BRAND.orange }}>Grande São Paulo — Cobertura FLEX</div>
                <div className="p-5 space-y-2">
                  {[
                    { regiao: 'Capital SP', ceps: '01000-000 a 05999-000' },
                    { regiao: 'Zona Leste', ceps: '08000-000 a 08499-000' },
                    { regiao: 'Zona Sul', ceps: '04000-000 a 04999-000' },
                    { regiao: 'ABCDM', ceps: '09000-000 a 09999-000' },
                    { regiao: 'Guarulhos', ceps: '07000-000 a 07399-000' },
                    { regiao: 'Osasco', ceps: '06000-000 a 06299-000' },
                    { regiao: 'Barueri/Carapicuíba', ceps: '06300-000 a 06499-000' },
                    { regiao: 'Taboão/Embu', ceps: '06700-000 a 06899-000' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-4 py-2 bg-white border border-gray-100">
                      <div><span className="font-bold text-sm" style={{ color: BRAND.charcoal }}>{r.regiao}</span><span className="text-gray-400 text-xs ml-2">{r.ceps}</span></div>
                      <span className="text-green-500 font-bold">✅</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ 8. ABRANGÊNCIA TOTAL ═══════ */}
      <section className="py-20" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge>SEÇÃO 8</SectionBadge>
            <SectionTitle>Abrangência <span style={{ color: BRAND.orange }}>Total</span></SectionTitle>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">A proposta constrói uma arquitetura logística inteligente para a LookChina, permitindo que cada pedido siga pelo canal mais adequado de acordo com peso, prazo e destino.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Globe, title: 'Cobertura Nacional', desc: 'Com os Correios, alcance a todos os CEPs do Brasil com preço competitivo.', color: '#2563EB' },
              { icon: Truck, title: 'Cargas Maiores', desc: 'Com a JadLog, atenda remessas acima de 30kg com capilaridade e preço agressivo.', color: '#7C3AED' },
              { icon: Zap, title: 'Velocidade Local', desc: 'Com Envios Flex, entregas no mesmo dia na Grande São Paulo.', color: '#16A34A' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${item.color}12` }}>
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 9. BENEFÍCIOS ESTRATÉGICOS ═══════ */}
      <section id="beneficios" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge>SEÇÃO 9</SectionBadge>
            <SectionTitle>Benefícios Estratégicos para a <span style={{ color: BRAND.orange }}>LookChina</span></SectionTitle>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Star, title: 'Fortalecimento da Marca', desc: 'Etiquetas com identidade LOOK ENVIOS agregam profissionalismo e reforçam presença em toda a jornada logística.' },
              { icon: TrendingUp, title: 'Competitividade no Frete', desc: 'Múltiplas modalidades trazem flexibilidade para trabalhar preço, prazo e perfil de remessa.' },
              { icon: Users, title: 'Melhor Experiência', desc: 'Entrega nacional, remessas maiores e entregas same day melhoram significativamente a jornada de compra.' },
              { icon: Rocket, title: 'Pronto para Crescer', desc: 'A operação nasce com base escalável, preparada para expansão de volume e amadurecimento logístico.' },
              { icon: Cpu, title: 'Inteligência Operacional', desc: 'Cada modalidade assume papel específico, trazendo clareza para a tomada de decisão logística.' },
              { icon: Globe, title: 'Ampliação de Cobertura', desc: 'Atendimento eficiente para remessas locais, envios nacionais e pacotes de maior porte.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
                className="rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1" style={{ backgroundColor: BRAND.lightGray }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${BRAND.orange}10` }}>
                  <item.icon className="w-6 h-6" style={{ color: BRAND.orange }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: BRAND.charcoal }}>{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 10. FASE 2 — OPERAÇÃO FULL ═══════ */}
      <section className="py-20" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge dark>SEÇÃO 10 — FASE 2</SectionBadge>
            <SectionTitle white>Operação <span style={{ color: BRAND.orange }}>Full</span></SectionTitle>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">Além da estrutura inicial, existe uma oportunidade estratégica muito relevante para a evolução do projeto: a implementação da operação Full na fase 2.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ x: -40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <div className="rounded-3xl p-8 border" style={{ background: `linear-gradient(135deg, ${BRAND.orange}10, ${BRAND.orange}05)`, borderColor: `${BRAND.orange}20` }}>
                <Warehouse className="w-16 h-16 mb-6" style={{ color: BRAND.orange }} />
                <h3 className="text-2xl font-bold text-white mb-4">Fulfillment Completo</h3>
                <p className="text-gray-400 leading-relaxed">
                  Os produtos poderão ser armazenados em galpão, permitindo que a operação ganhe ainda mais eficiência, organização e velocidade. A LOOK ENVIOS passa a incorporar uma lógica completa de fulfillment.
                </p>
              </div>
            </motion.div>
            <motion.div initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }}>
              <h3 className="text-lg font-bold text-white mb-4">A operação Full possibilita:</h3>
              <div className="space-y-3">
                {[
                  'Armazenagem estruturada dos itens',
                  'Maior controle de estoque',
                  'Mais agilidade na separação de pedidos',
                  'Aceleração do processo de expedição',
                  'Ganho de eficiência operacional',
                  'Melhoria no prazo de despacho',
                  'Base para crescimento com maior escala',
                ].map((item, i) => <BulletItem key={i} dark>{item}</BulletItem>)}
              </div>
              <div className="mt-6 rounded-xl p-4 border" style={{ backgroundColor: `${BRAND.orange}10`, borderColor: `${BRAND.orange}20` }}>
                <p className="text-sm font-medium" style={{ color: BRAND.orangeLight }}>Os valores da operação Full serão apresentados em uma proposta comercial separada, específica para essa segunda fase do projeto.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ 11. TARIFAS DIAMANTE ═══════ */}
      <section id="tarifas" className="py-20 relative overflow-hidden" style={{ backgroundColor: BRAND.dark }}>
        <motion.div className="absolute top-10 right-10 opacity-5" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}><Gem className="w-60 h-60" style={{ color: BRAND.orange }} /></motion.div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <SectionBadge dark><Gem className="w-3 h-3 inline mr-1" /> SEÇÃO 11 — ESTRUTURA COMERCIAL</SectionBadge>
            <SectionTitle white>Tabela <span style={{ color: BRAND.orange }}>Diamante</span> Correios</SectionTitle>
            <p className="text-gray-500 text-lg">Até 85% mais barato que a tabela balcão</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'SP Capital', value: 'R$ 6,90', desc: 'PAC até 100g', icon: Target },
              { label: 'Economia', value: 'Até 85%', desc: 'vs. Tabela Balcão', icon: TrendingUp },
              { label: 'Cobertura', value: '100%', desc: 'Todos os CEPs', icon: Globe },
            ].map((card, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} className="rounded-2xl p-6 border" style={{ background: `linear-gradient(135deg, ${BRAND.orange}18, ${BRAND.orange}08)`, borderColor: `${BRAND.orange}25` }}>
                <card.icon className="w-8 h-8 mb-3" style={{ color: BRAND.orange }} />
                <div className="text-3xl font-black text-white mb-1">{card.value}</div>
                <div className="font-semibold text-sm" style={{ color: BRAND.orangeLight }}>{card.label}</div>
                <div className="text-gray-500 text-xs mt-1">{card.desc}</div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl border overflow-hidden mb-8" style={{ backgroundColor: `${BRAND.white}05`, borderColor: `${BRAND.white}10` }}>
            <div className="px-6 py-3 border-b" style={{ borderColor: `${BRAND.white}10` }}><h3 className="text-white font-bold flex items-center gap-2"><Package className="w-4 h-4" style={{ color: BRAND.orange }} /> PAC — Capitais (Contrato Diamante)</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ backgroundColor: BRAND.orange }}><th className="px-4 py-3 text-left text-white font-bold">Faixa</th><th className="px-4 py-3 text-center text-white font-bold">SP</th><th className="px-4 py-3 text-center text-white font-bold">Sudeste</th><th className="px-4 py-3 text-center text-white font-bold">Sul</th><th className="px-4 py-3 text-center text-white font-bold">Nordeste</th><th className="px-4 py-3 text-center text-white font-bold">Norte</th></tr></thead>
              <tbody>{tabelaDiamanteData.map((row, i) => (<motion.tr key={i} initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="border-b" style={{ borderColor: `${BRAND.white}05`, backgroundColor: i % 2 === 0 ? `${BRAND.white}03` : 'transparent' }}><td className="px-4 py-3 font-semibold" style={{ color: BRAND.orangeLight }}>{row.faixa}</td><td className="px-4 py-3 text-center font-bold" style={{ color: '#4ADE80' }}>{row.sp}</td><td className="px-4 py-3 text-center text-gray-300">{row.sudeste}</td><td className="px-4 py-3 text-center text-gray-300">{row.sul}</td><td className="px-4 py-3 text-center text-gray-300">{row.nordeste}</td><td className="px-4 py-3 text-center text-gray-300">{row.norte}</td></motion.tr>))}</tbody></table></div>
          </motion.div>
          <div className="text-center">
            <p className="text-gray-500 text-sm italic">As tabelas comerciais específicas de cada modalidade (Correios, JadLog e Envios Flex) acompanham a proposta em anexo.</p>
          </div>
        </div>
      </section>

      {/* ═══════ 12. CONCLUSÃO / CTA ═══════ */}
      <section id="contato" className="py-24" style={{ backgroundColor: BRAND.charcoal }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
            <SectionBadge dark>SEÇÃO 12 — CONCLUSÃO</SectionBadge>
            <img src={lookLogo} alt="Look China" className="h-14 mx-auto mb-6 invert brightness-200 opacity-80" />
            <SectionTitle white>Uma proposta sólida para o <span style={{ color: BRAND.orange }}>futuro</span></SectionTitle>
            <p className="text-gray-400 text-lg mb-6 max-w-3xl mx-auto leading-relaxed">
              A BRHUB apresenta à LookChina uma proposta sólida para criação da LOOK ENVIOS, transformando a logística da marca em uma operação mais profissional, mais estratégica e mais preparada para crescer.
            </p>
            <p className="text-gray-500 text-base mb-10 max-w-3xl mx-auto leading-relaxed">
              A utilização de etiquetas com o logo LOOK ENVIOS, aliada à estrutura de operação com Correios, JadLog e Envios Flex, cria uma malha logística completa, com cobertura nacional, força regional e alta competitividade comercial. Um projeto pensado para atender o presente e preparar o futuro — já abrindo caminho para uma segunda fase com modelo Full, armazenagem em galpão e ainda mais agilidade nos envios.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-10">
              {[
                { icon: Package, label: 'Correios Diamante' },
                { icon: Truck, label: 'JadLog Ouro' },
                { icon: Zap, label: 'Envios Flex' },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: `${BRAND.orange}10`, borderColor: `${BRAND.orange}20` }}>
                  <item.icon className="w-6 h-6 mx-auto mb-2" style={{ color: BRAND.orange }} />
                  <div className="text-xs font-bold text-white">{item.label}</div>
                </div>
              ))}
            </div>

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
