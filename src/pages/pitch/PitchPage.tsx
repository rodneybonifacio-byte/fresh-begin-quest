import { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import {
  Truck, Bot, Globe, Warehouse, MapPin, Handshake, ChevronRight,
  ChevronLeft, BarChart3, Zap, Shield, Package, TrendingUp,
  Building2, ArrowRight, CheckCircle2, Sparkles, Phone, Brain, Mic, Eye, MessageCircle,
  Bell, AlertTriangle, Clock, Send, Star, ShieldCheck, DollarSign
} from "lucide-react";


// ─── Data ────────────────────────────────────────────────────────────────────

const SLIDES = [
  "cover",
  "opportunity",
  "projections",
  "integration",
  "platform",
  "ai-features",
  "notifications",
  "collection-points",
  "timeline",
  "revenue",
  "closing",
] as const;

const monthLabels = ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6", "Mês 7", "Mês 8", "Mês 9", "Mês 10", "Mês 11", "Mês 12"];

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  orange: "#f97316",
  orangeLight: "#fdba74",
  orangeBg: "rgba(249,115,22,0.08)",
  orangeBorder: "rgba(249,115,22,0.2)",
  navy: "#1e3a5f",
  navyLight: "#2d5a8e",
  navyBg: "rgba(30,58,95,0.06)",
  cream: "#fdf6ee",
  creamDark: "#f5e6d0",
  white: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  amber: "#f59e0b",
  emerald: "#10b981",
};

// ─── Chart configs ───────────────────────────────────────────────────────────

const digitalData = [0.04, 0.08, 0.12, 0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.64, 0.72, 0.80];
const conversionData = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const projectionChart: { series: ApexOptions["series"]; options: ApexOptions } = {
  series: [
    { name: "Faturamento Físico (R$ mi)", data: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
    { name: "Projeção Digital (R$ mi)", data: digitalData },
  ],
  options: {
    chart: { type: "area", height: 340, toolbar: { show: false }, background: "transparent", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" },
    colors: [C.navy, C.orange],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    stroke: { curve: "smooth", width: 3 },
    xaxis: { categories: monthLabels, labels: { style: { colors: C.textMuted } } },
    yaxis: { labels: { style: { colors: C.textMuted }, formatter: (v: number) => `R$ ${v}M` } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    tooltip: { theme: "light" },
    legend: { labels: { colors: C.text } },
    dataLabels: { enabled: false },
  },
};

// Digital conversion projection chart (R$8M/mês physical → digital potential)
const digitalConversionChart: { series: ApexOptions["series"]; options: ApexOptions } = {
  series: [{ name: "% Conversão Digital", data: conversionData }],
  options: {
    chart: { type: "bar", height: 260, toolbar: { show: false }, background: "transparent" },
    colors: [C.orange],
    xaxis: { categories: monthLabels, labels: { style: { colors: C.textMuted, fontSize: "10px" } } },
    yaxis: { max: 12, labels: { style: { colors: C.textMuted }, formatter: (v: number) => `${v}%` } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    tooltip: { theme: "light", y: { formatter: (v: number) => `${v}% do físico = R$ ${((v / 100) * 8).toFixed(2)}M` } },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PitchPage() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setCurrent((p) => Math.min(p + 1, SLIDES.length - 1)); }
      if (e.key === "ArrowLeft") setCurrent((p) => Math.max(p - 1, 0));
      if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
      if (e.key === "Escape") document.exitFullscreen?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="pitch-page min-h-screen select-none overflow-hidden relative" style={{ background: C.cream, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* BRHUB Logo - fixed on all slides */}
      {/* Decorative circles */}
      <div className="fixed top-[-120px] right-[-120px] w-[340px] h-[340px] rounded-full opacity-20 pointer-events-none" style={{ background: C.orange }} />
      <div className="fixed bottom-[-80px] left-[-80px] w-[260px] h-[260px] rounded-full opacity-10 pointer-events-none" style={{ background: C.navy }} />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50" style={{ background: C.creamDark }}>
        <div className="h-full transition-all duration-500 rounded-r-full" style={{ width: `${((current + 1) / SLIDES.length) * 100}%`, background: `linear-gradient(90deg, ${C.orange}, ${C.amber})` }} />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full px-6 py-3 shadow-lg border" style={{ background: C.white, borderColor: C.creamDark }}>
        <button onClick={() => setCurrent((p) => Math.max(p - 1, 0))} className="p-1 transition disabled:opacity-30" style={{ color: C.navy }} disabled={current === 0}><ChevronLeft size={20} /></button>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="transition-all rounded-full" style={{ width: i === current ? 28 : 10, height: 10, background: i === current ? C.orange : C.creamDark }} />
          ))}
        </div>
        <button onClick={() => setCurrent((p) => Math.min(p + 1, SLIDES.length - 1))} className="p-1 transition disabled:opacity-30" style={{ color: C.navy }} disabled={current === SLIDES.length - 1}><ChevronRight size={20} /></button>
        <span className="text-xs ml-2 font-mono" style={{ color: C.textMuted }}>{current + 1}/{SLIDES.length}</span>
      </div>

      {/* Slides */}
      <div className="h-screen flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto animate-pitch-fade" key={slide}>

          {/* ─── COVER ─────────────────────────────────────────── */}
          {slide === "cover" && (
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold" style={{ background: C.orangeBg, color: C.orange, border: `1px solid ${C.orangeBorder}` }}>
                  <Sparkles size={16} /> Proposta de Parceria 2026
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight" style={{ color: C.navy }}>
                  Proposta de<br />
                  <span style={{ color: C.orange }}>Negócio</span>
                </h1>
                <p className="text-lg leading-relaxed max-w-lg" style={{ color: C.textMuted }}>
                  Marketplace logístico integrado com tecnologia de ponta, suporte IA e operação omnichannel — <strong style={{ color: C.navy }}>BRHUB Tech × Flex Envios × Look China</strong>
                </p>
                <button onClick={() => setCurrent(1)} className="text-white px-8 py-3.5 rounded-full font-semibold flex items-center gap-2 transition shadow-lg hover:shadow-xl" style={{ background: C.orange }}>
                  Iniciar Apresentação <ArrowRight size={18} />
                </button>
                <p className="text-xs pt-2 flex items-center gap-1" style={{ color: C.textMuted }}><ArrowRight size={12} /> ou Espaço para avançar · F para tela cheia</p>
              </div>
              <div className="flex-1 flex justify-center relative">
                <div className="w-72 h-72 md:w-96 md:h-96 rounded-full relative" style={{ background: C.orange }}>
                  <div className="absolute inset-4 rounded-full" style={{ background: C.navy }} />
                  <div className="absolute inset-10 rounded-full flex items-center justify-center" style={{ background: C.cream }}>
                    <div className="text-center">
                      <Truck size={64} style={{ color: C.orange }} className="mx-auto mb-3" />
                      <p className="font-extrabold text-2xl" style={{ color: C.navy }}>BRHUB</p>
                      <p className="text-sm font-medium" style={{ color: C.orange }}>Tech / Envios</p>
                    </div>
                  </div>
                </div>
                {/* Small accent circles */}
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full" style={{ background: C.amber }} />
                <div className="absolute bottom-8 left-0 w-10 h-10 rounded-full border-4" style={{ borderColor: C.orange }} />
              </div>
            </div>
          )}

          {/* ─── OPPORTUNITY ────────────────────────────────────── */}
          {slide === "opportunity" && (
            <div className="space-y-8">
              <SectionHeader icon={<TrendingUp />} title="A Oportunidade" subtitle="Por que agora?" />
              <div className="grid md:grid-cols-3 gap-6">
                <OrangeMetricCard icon={<Globe size={28} />} value="R$ 8M/mês" label="Volume atual Look China (físico)" />
                <OrangeMetricCard icon={<Package size={28} />} value="R$ 96M/ano" label="Potencial de conversão digital" />
                <OrangeMetricCard icon={<Building2 size={28} />} value="Look China" label="2 pontos estratégicos prontos" />
              </div>
              <div className="rounded-2xl p-8 border" style={{ background: C.white, borderColor: C.creamDark }}>
                <h3 className="text-xl font-bold mb-3" style={{ color: C.navy }}>A Proposta</h3>
                <p className="leading-relaxed text-lg" style={{ color: C.textMuted }}>
                  A <strong style={{ color: C.orange }}>BRHUB Tech/Envios</strong> convida o grupo <strong style={{ color: C.navy }}>Flex Envios</strong> a se tornar parceiro e <strong style={{ color: C.orange }}>operador logístico oficial</strong> do marketplace Look China, com infraestrutura tecnológica completa, pontos de coleta estratégicos e modelo de receita compartilhada.
                </p>
              </div>
            </div>
          )}

          {/* ─── PLATFORM ──────────────────────────────────────── */}
          {slide === "platform" && (
            <div className="space-y-8">
              <SectionHeader icon={<Zap />} title="Plataforma BRHUB" subtitle="Recursos principais" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { icon: <Package size={24} />, title: "Emissão de Etiquetas", desc: "Cotação multi-transportadora, etiqueta em segundos" },
                  { icon: <Truck size={24} />, title: "Rastreamento Inteligente", desc: "Tracking em tempo real com notificações automáticas" },
                  { icon: <BarChart3 size={24} />, title: "Dashboard Analytics", desc: "Visão 360° de envios, custos e performance" },
                  { icon: <Shield size={24} />, title: "Gestão Financeira", desc: "Faturas, créditos pré-pagos e extrato completo" },
                  { icon: <Globe size={24} />, title: "Integrações", desc: "API aberta para conectar qualquer plataforma" },
                  { icon: <Warehouse size={24} />, title: "FULL (Galpão)", desc: "Sistema completo de fulfillment e expedição" },
                ].map((f, i) => (
                  <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ─── AI FEATURES ───────────────────────────────────── */}
          {slide === "ai-features" && (
            <div className="space-y-5">
              <SectionHeader icon={<Bot />} title="Ecossistema de IA" subtitle="Inteligência artificial de ponta a ponta" />

              {/* Top row: 3 providers + intro merged */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: <Brain size={24} />, bg: C.orangeBg, iconColor: C.orange, name: "Google Gemini", desc: "Raciocínio multimodal. Texto, imagens e contextos massivos em tempo real." },
                  { icon: <Eye size={24} />, bg: C.navyBg, iconColor: C.navy, name: "OpenAI GPT-5", desc: "Compreensão de linguagem, análise de sentimento e respostas empáticas." },
                  { icon: <Mic size={24} />, bg: "rgba(245,158,11,0.1)", iconColor: C.amber, name: "ElevenLabs", desc: "Voz indistinguível de humano. Áudios gerados em tempo real no WhatsApp." },
                ].map((p, i) => (
                  <div key={i} className="rounded-xl p-4 border flex items-start gap-3" style={{ background: C.white, borderColor: C.creamDark }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.bg }}>
                      <span style={{ color: p.iconColor }}>{p.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: C.navy }}>{p.name}</h4>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.textMuted }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main content: Agent left + Features right */}
              <div className="grid md:grid-cols-5 gap-5">
                {/* WhatsApp Agent — wider */}
                <div className="md:col-span-3 rounded-2xl p-6 space-y-4 text-white relative overflow-hidden" style={{ background: C.navy }}>
                  <div className="absolute top-[-30px] right-[-30px] w-28 h-28 rounded-full opacity-20" style={{ background: C.orange }} />
                  <h3 className="text-xl font-bold flex items-center gap-2"><MessageCircle size={22} style={{ color: C.orangeLight }} /> WhatsApp AI Agent</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      "Rastreamento automático por código",
                      "Resolução 24/7 sem intervenção",
                      "Detecção de sentimento inteligente",
                      "Áudio humanizado via ElevenLabs",
                      "Notificações proativas de entrega",
                      "Pipeline de suporte automático",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-white/90 text-sm">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.orangeLight }} /> {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature cards — narrower stack */}
                <div className="md:col-span-2 space-y-3">
                  {[
                    { icon: <Sparkles size={16} />, color: C.amber, title: "Sinalização Inteligente", desc: "Alertas de atraso e entrega falhada. IA sugere ações antes do cliente reclamar." },
                    { icon: <Phone size={16} />, color: C.emerald, title: "CRM WhatsApp", desc: "Conversas, tickets, templates HSM e métricas de atendimento em tempo real." },
                    { icon: <Zap size={16} />, color: C.orange, title: "Tools AI-Powered", desc: "Cotação, rastreio, tickets e busca de dados acionados via IA no WhatsApp." },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl p-4 border" style={{ background: C.white, borderColor: C.creamDark }}>
                      <h4 className="font-bold text-sm mb-1 flex items-center gap-2" style={{ color: C.navy }}>
                        <span style={{ color: item.color }}>{item.icon}</span> {item.title}
                      </h4>
                      <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATIONS ─────────────────────────────────── */}
          {slide === "notifications" && (
            <div className="space-y-7">
              <SectionHeader icon={<Bell />} title="Notificações Proativas" subtitle="O cliente sabe antes de perguntar" />

              {/* Delay Algorithm highlight */}
              <div className="rounded-2xl p-8 relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, #2d5a8e)` }}>
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full opacity-15" style={{ background: C.orange }} />
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(249,115,22,0.2)" }}>
                    <AlertTriangle size={32} style={{ color: C.orangeLight }} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Brain size={20} style={{ color: C.orangeLight }} /> Algoritmo Preditivo de Atraso</h3>
                    <p className="text-white/85 leading-relaxed">
                      Nosso sistema monitora <strong className="text-white">cada objeto em trânsito em tempo real</strong>. A cada 15 minutos, um cron inteligente cruza a data prevista de entrega com o horário atual (fuso de Brasília). Se detecta que o prazo será estourado — ou que já são <strong className="text-white">16h15 do dia previsto</strong> sem movimentação — o cliente recebe automaticamente uma notificação via WhatsApp <strong style={{ color: C.orangeLight }}>antes mesmo de perceber o atraso</strong>.
                    </p>
                    <p className="text-white/70 text-sm flex items-start gap-2">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: C.orangeLight }} /> Deduplicação inteligente: cada alerta é enviado apenas 1x a cada 30 dias por objeto, evitando spam.
                    </p>
                  </div>
                </div>
              </div>

              {/* All notification types */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: <Send size={20} />, color: C.orange, title: "Etiqueta Criada", desc: "Assim que o envio é gerado, o destinatário recebe código de rastreio e previsão de entrega." },
                  { icon: <Package size={20} />, color: C.navy, title: "Objeto Postado", desc: "Confirmação de que o pacote foi entregue à transportadora com data atualizada via API de rastreio." },
                  { icon: <Truck size={20} />, color: C.emerald, title: "Saiu para Entrega", desc: "Notificação em tempo real quando o objeto entra na rota final de entrega ao destinatário." },
                  { icon: <Clock size={20} />, color: C.amber, title: "Aguardando Retirada", desc: "Alerta quando o objeto está disponível para retirada em agência, evitando devoluções." },
                  { icon: <AlertTriangle size={20} />, color: "#ef4444", title: "Alerta de Atraso", desc: "Algoritmo preditivo avisa o cliente proativamente antes que ele perceba o atraso na entrega." },
                  { icon: <Star size={20} />, color: C.orange, title: "Avaliação Pós-Entrega", desc: "Solicita feedback após a entrega para medir NPS e qualidade do serviço logístico." },
                ].map((n, i) => (
                  <div key={i} className="rounded-xl p-5 border flex gap-4" style={{ background: C.white, borderColor: C.creamDark }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${n.color}15` }}>
                      <span style={{ color: n.color }}>{n.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1" style={{ color: C.navy }}>{n.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom highlight */}
              <div className="rounded-xl p-5 border flex items-center gap-4" style={{ background: C.orangeBg, borderColor: C.orangeBorder }}>
                <ShieldCheck size={24} style={{ color: C.orange }} />
                <p className="text-sm" style={{ color: C.text }}>
                  <strong style={{ color: C.navy }}>Pipeline automatizado de 6 estágios</strong> — cada notificação move o card do cliente no CRM automaticamente: <span style={{ color: C.textMuted }}>Pré-postado <ArrowRight size={12} className="inline" /> Em Trânsito <ArrowRight size={12} className="inline" /> Saiu p/ Entrega <ArrowRight size={12} className="inline" /> Aguardando Retirada <ArrowRight size={12} className="inline" /> Atrasado <ArrowRight size={12} className="inline" /> Entregue</span>. Progressão estritamente crescente, sem retrocesso.
                </p>
              </div>
            </div>
          )}

          {/* ─── INTEGRATION ───────────────────────────────────── */}
          {slide === "integration" && (
            <div className="space-y-8">
              <SectionHeader icon={<Globe />} title="Arquitetura de Integração" subtitle="Como funciona tecnicamente" />
              <div className="rounded-2xl p-10 border" style={{ background: C.white, borderColor: C.creamDark }}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="integration-node" style={{ animationDelay: "0.2s" }}>
                    <CircleBlock label="Flex Envios" sub="Disponibiliza API" color={C.amber} />
                  </div>
                  <div className="integration-arrow" style={{ animationDelay: "0.6s" }}>
                    <div className="hidden md:flex items-center gap-1">
                      <div className="h-[3px] w-12 rounded-full integration-line" style={{ background: C.orange }} />
                      <ArrowRight size={28} style={{ color: C.orange }} />
                    </div>
                    <div className="md:hidden">
                      <ArrowRight size={28} className="rotate-90" style={{ color: C.orange }} />
                    </div>
                  </div>
                  <div className="integration-node" style={{ animationDelay: "0.9s" }}>
                    <CircleBlock label="BRHUB Tech" sub="Desenvolve & Integra" color={C.orange} />
                  </div>
                  <div className="integration-arrow" style={{ animationDelay: "1.3s" }}>
                    <div className="hidden md:flex items-center gap-1">
                      <div className="h-[3px] w-12 rounded-full integration-line" style={{ background: C.navy }} />
                      <ArrowRight size={28} style={{ color: C.navy }} />
                    </div>
                    <div className="md:hidden">
                      <ArrowRight size={28} className="rotate-90" style={{ color: C.navy }} />
                    </div>
                  </div>
                  <div className="integration-node" style={{ animationDelay: "1.6s" }}>
                    <CircleBlock label="Look China" sub="Whitelabel Marketplace" color={C.navy} />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="integration-card rounded-xl p-6 border" style={{ background: C.white, borderColor: C.creamDark, animationDelay: "2s" }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: C.orange }}><Globe size={18} /> Plataforma Marketplace</h4>
                  <ul className="space-y-2 text-sm" style={{ color: C.textMuted }}>
                    <li>• Nova plataforma integrada com contrato Flex Envios</li>
                    <li>• Whitelabel personalizado Look China</li>
                    <li>• Desenvolvimento 100% BRHUB</li>
                    <li>• Dashboard próprio para o lojista</li>
                  </ul>
                </div>
                <div className="integration-card rounded-xl p-6 border" style={{ background: C.white, borderColor: C.creamDark, animationDelay: "2.2s" }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: C.navy }}><Warehouse size={18} /> Sistema FULL (Galpão)</h4>
                  <ul className="space-y-2 text-sm" style={{ color: C.textMuted }}>
                    <li>• Fulfillment completo no galpão do parceiro</li>
                    <li>• Desenvolvimento dedicado se necessário</li>
                    <li>• Integração com estoque e expedição</li>
                    <li>• Gestão de coleta e despacho automatizada</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ─── COLLECTION POINTS ─────────────────────────────── */}
          {slide === "collection-points" && (
            <div className="space-y-8">
              <SectionHeader icon={<MapPin />} title="Pontos de Coleta" subtitle="Localização estratégica em São Paulo" />
              <div className="grid md:grid-cols-2 gap-8">
                <LocationCard name="Look China" address="Rua Carnot" type="Ponto de Coleta Principal" features={["Recebimento de encomendas", "Atendimento ao lojista", "Etiquetagem e despacho", "Suporte presencial"]} />
                <LocationCard name="Look China Shopping" address="Rua Maria Marcolina" type="Ponto de Coleta Secundário" features={["Coleta centralizada do shopping", "Alto volume de lojistas", "Expedição diária", "Integração com marketplace"]} />
              </div>
              <div className="rounded-xl p-6 text-center" style={{ background: C.orangeBg, border: `1px solid ${C.orangeBorder}` }}>
                <p className="text-lg flex items-center justify-center gap-2" style={{ color: C.navy }}>
                  <MapPin size={20} style={{ color: C.orange }} /> Dois pontos estratégicos = <strong>maior cobertura</strong> e <strong>conveniência</strong> para os lojistas do marketplace
                </p>
              </div>
            </div>
          )}

          {/* ─── REVENUE (now near closing) ─────────────────── */}
          {slide === "revenue" && (
            <div className="space-y-7">
              <SectionHeader icon={<Handshake />} title="Modelo de Receita & Pagamento" subtitle="Divisão de lucros, fluxo financeiro e eliminação de risco" />

              {/* Highlight: BRHUB assumes payment */}
              <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: C.navy }}>
                <div className="absolute top-[-40px] right-[-40px] w-32 h-32 rounded-full opacity-15" style={{ background: C.orange }} />
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(249,115,22,0.2)" }}>
                    <ShieldCheck size={28} style={{ color: C.orangeLight }} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white">Zero Risco de Inadimplência para a Flex</h4>
                    <p className="text-white/80 leading-relaxed">
                      A <strong className="text-white">BRHUB assume 100% da cobrança e do risco de inadimplência</strong>. A Flex Envios recebe repasses mensais já com todo o cálculo de margem efetuado — sem preocupação com recebimentos ou calotes.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      {["BRHUB cobra o cliente", "Zero inadimplência Flex", "Repasse mensal garantido", "Margem já calculada"].map((tag, i) => (
                        <span key={i} className="text-xs font-semibold rounded-full px-4 py-1.5" style={{ background: "rgba(249,115,22,0.15)", color: C.orangeLight }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Division cards */}
              <div className="grid md:grid-cols-3 gap-5">
                <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: C.white, borderColor: C.creamDark }}>
                  <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl" style={{ background: C.navy }} />
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: C.navyBg }}>
                    <Building2 size={24} style={{ color: C.navy }} />
                  </div>
                  <h4 className="font-extrabold text-2xl mb-1" style={{ color: C.navy }}>50%</h4>
                  <h5 className="font-bold mb-2" style={{ color: C.navy }}>BRHUB Tech</h5>
                  <p className="text-xs font-semibold mb-3 px-2 py-1 rounded-full inline-block" style={{ background: C.navyBg, color: C.navy }}>do lucro das etiquetas</p>
                  <ul className="space-y-1.5 text-sm" style={{ color: C.textMuted }}>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.navy }} /> Infraestrutura tecnológica</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.navy }} /> Assume cobrança e inadimplência</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.navy }} /> Suporte com IA 24/7</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.navy }} /> Calcula e repassa margens</li>
                  </ul>
                </div>
                <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: C.white, borderColor: C.creamDark }}>
                  <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl" style={{ background: C.orange }} />
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: C.orangeBg }}>
                    <Truck size={24} style={{ color: C.orange }} />
                  </div>
                  <h4 className="font-extrabold text-2xl mb-1" style={{ color: C.orange }}>50%</h4>
                  <h5 className="font-bold mb-2" style={{ color: C.orange }}>Flex Envios</h5>
                  <p className="text-xs font-semibold mb-3 px-2 py-1 rounded-full inline-block" style={{ background: C.orangeBg, color: C.orange }}>do lucro das etiquetas</p>
                  <ul className="space-y-1.5 text-sm" style={{ color: C.textMuted }}>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.orange }} /> Operação logística</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.orange }} /> API de contratos</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.orange }} /> Recebe repasse sem risco</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.orange }} /> Rede de distribuição</li>
                  </ul>
                </div>
                <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: C.white, borderColor: C.creamDark }}>
                  <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl" style={{ background: C.emerald }} />
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(16,185,129,0.1)" }}>
                    <TrendingUp size={24} style={{ color: C.emerald }} />
                  </div>
                  <h4 className="font-extrabold text-2xl mb-1" style={{ color: C.emerald }}>+12%</h4>
                  <h5 className="font-bold mb-2" style={{ color: C.emerald }}>Margem Agência</h5>
                  <p className="text-xs font-semibold mb-3 px-2 py-1 rounded-full inline-block" style={{ background: "rgba(16,185,129,0.1)", color: C.emerald }}>sobre volume postado</p>
                  <ul className="space-y-1.5 text-sm" style={{ color: C.textMuted }}>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.emerald }} /> Receita da Flex sobre postagem</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.emerald }} /> Receita garantida</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.emerald }} /> Independe do marketplace</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: C.emerald }} /> Recorrente mensal</li>
                  </ul>
                </div>
              </div>

              {/* Payment flow */}
              <div className="rounded-2xl p-6 border" style={{ background: C.white, borderColor: C.creamDark }}>
                <h4 className="font-bold text-sm mb-4" style={{ color: C.navy }}>Fluxo de Pagamento Mensal</h4>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: "1", title: "Cliente usa", desc: "Emite etiquetas durante o mês todo", icon: <Package size={20} /> },
                    { step: "2", title: "BRHUB cobra", desc: "Fechamento mensal consolidado e cobrança ao cliente", icon: <DollarSign size={20} /> },
                    { step: "3", title: "Calcula margem", desc: "Custo, lucro e divisão 50/50 apurados automaticamente", icon: <BarChart3 size={20} /> },
                    { step: "4", title: "Repassa à Flex", desc: "Flex recebe sua parte + 12% agência, sem inadimplência", icon: <Handshake size={20} /> },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl" style={{ background: i === 3 ? C.orangeBg : C.cream }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 text-white font-bold text-sm" style={{ background: i === 3 ? C.orange : C.navy }}>
                        {item.step}
                      </div>
                      <div className="mb-1" style={{ color: i === 3 ? C.orange : C.navy }}>{item.icon}</div>
                      <h5 className="font-bold text-sm" style={{ color: C.text }}>{item.title}</h5>
                      <p className="text-xs mt-1" style={{ color: C.textMuted }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── PROJECTIONS ───────────────────────────────────── */}
          {slide === "projections" && (
            <div className="space-y-7">
              <SectionHeader icon={<TrendingUp />} title="Projeção de Mercado" subtitle="R$ 8 milhões/mês no físico — potencial digital" />

              {/* Context card */}
              <div className="rounded-xl p-5 border flex items-start gap-4" style={{ background: C.orangeBg, borderColor: C.orangeBorder }}>
                <BarChart3 size={22} className="mt-0.5 shrink-0" style={{ color: C.orange }} />
                <p className="text-sm" style={{ color: C.text }}>
                  O grupo já movimenta <strong style={{ color: C.navy }}>R$ 8 milhões por mês</strong> (R$ 96M/ano) no comércio físico. A projeção conservadora estima a conversão progressiva para o digital, começando em <strong style={{ color: C.orange }}>0,5%</strong> e atingindo <strong style={{ color: C.orange }}>10%</strong> do faturamento físico em 12 meses — um crescimento orgânico e sustentável.
                </p>
              </div>

              {/* Charts side by side */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6 border" style={{ background: C.white, borderColor: C.creamDark }}>
                  <h4 className="font-bold mb-2 text-sm" style={{ color: C.navy }}>Faturamento Físico vs Digital (R$ mi/mês)</h4>
                  <ReactApexChart options={projectionChart.options} series={projectionChart.series} type="area" height={280} />
                </div>
                <div className="rounded-2xl p-6 border" style={{ background: C.white, borderColor: C.creamDark }}>
                  <h4 className="font-bold mb-2 text-sm" style={{ color: C.navy }}>Crescimento Digital vs Base Física (%)</h4>
                  <ReactApexChart options={digitalConversionChart.options} series={digitalConversionChart.series} type="bar" height={280} />
                </div>
              </div>

              {/* Shipment volume table */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: C.white, borderColor: C.creamDark }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: C.creamDark }}>
                  <h4 className="font-bold text-sm" style={{ color: C.navy }}>Evolução: Faturamento → Volume de Envios</h4>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{ background: C.orangeBg, color: C.orange }}>Ticket médio: R$ 25/etiqueta</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: C.cream }}>
                        <th className="px-3 py-2.5 text-left font-semibold" style={{ color: C.textMuted }}>Mês</th>
                        <th className="px-3 py-2.5 text-right font-semibold" style={{ color: C.navy }}>Faturamento Digital</th>
                        <th className="px-3 py-2.5 text-right font-semibold" style={{ color: C.orange }}>Envios/mês</th>
                        <th className="px-3 py-2.5 text-right font-semibold" style={{ color: C.emerald }}>Envios/dia</th>
                        <th className="px-3 py-2.5 text-right font-semibold" style={{ color: C.amber }}>Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0.4, 0.8, 1.4, 2.2, 3.2, 4.2, 5.4, 6.8, 8.4, 10.2, 12.2, 14.6].map((fat, i) => {
                        const enviosMes = Math.round((fat * 1_000_000) / 25);
                        const enviosDia = Math.round(enviosMes / 26);
                        const acumulado = [0.4, 0.8, 1.4, 2.2, 3.2, 4.2, 5.4, 6.8, 8.4, 10.2, 12.2, 14.6]
                          .slice(0, i + 1)
                          .reduce((sum, v) => sum + Math.round((v * 1_000_000) / 25), 0);
                        const isLast = i === 11;
                        return (
                          <tr key={i} className="border-t" style={{ borderColor: C.creamDark, background: isLast ? C.orangeBg : 'transparent' }}>
                            <td className="px-3 py-2 font-medium" style={{ color: C.text }}>Mês {i + 1}</td>
                            <td className="px-3 py-2 text-right font-semibold" style={{ color: C.navy }}>R$ {fat}M</td>
                            <td className="px-3 py-2 text-right font-bold" style={{ color: C.orange }}>{enviosMes.toLocaleString('pt-BR')}</td>
                            <td className="px-3 py-2 text-right" style={{ color: C.emerald }}>~{enviosDia.toLocaleString('pt-BR')}</td>
                            <td className="px-3 py-2 text-right" style={{ color: C.amber }}>{acumulado.toLocaleString('pt-BR')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Faturamento Físico/Mês", value: "R$ 8M", color: C.navy },
                  { label: "Digital no Mês 12", value: "R$ 14,6M", color: C.orange },
                  { label: "Envios no Mês 12", value: "584 mil", color: C.amber },
                  { label: "Total Envios Ano 1", value: "2,78M", color: C.emerald },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl p-4 text-center border" style={{ background: C.white, borderColor: C.creamDark }}>
                    <div className="text-xl font-extrabold" style={{ color: m.color }}>{m.value}</div>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TIMELINE ──────────────────────────────────────── */}
          {slide === "timeline" && (
            <div className="space-y-8">
              <SectionHeader icon={<Zap />} title="Roadmap" subtitle="Fases do projeto" />
              <div className="space-y-4">
                {[
                  { phase: "01", period: "Semana 1-2", title: "Setup & Integração API", items: ["Configuração API Flex Envios", "Ambiente de desenvolvimento", "Whitelabel base Look China"] },
                  { phase: "02", period: "Semana 3-4", title: "Plataforma Marketplace", items: ["Dashboard do lojista", "Emissão de etiquetas integrada", "Rastreamento automático"] },
                  { phase: "03", period: "Semana 5-6", title: "IA & Automação", items: ["Agente WhatsApp AI", "Notificações automáticas HSM", "Pipeline de suporte"] },
                  { phase: "04", period: "Semana 7-8", title: "Pontos de Coleta & FULL", items: ["Setup Rua Carnot & Maria Marcolina", "Sistema FULL no galpão", "Go-live operação completa"] },
                ].map((p, i) => (
                  <div key={i} className="flex gap-5 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-lg" style={{ background: C.orange }}>
                        {p.phase}
                      </div>
                      {i < 3 && <div className="w-0.5 h-full mt-1" style={{ background: C.creamDark }} />}
                    </div>
                    <div className="rounded-xl p-5 flex-1 mb-1 border" style={{ background: C.white, borderColor: C.creamDark }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs rounded-full px-3 py-1 font-mono font-semibold" style={{ background: C.orangeBg, color: C.orange }}>{p.period}</span>
                        <span className="font-bold" style={{ color: C.navy }}>{p.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.items.map((item, j) => (
                          <span key={j} className="text-xs rounded-lg px-3 py-1.5" style={{ background: C.cream, color: C.textMuted }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── CLOSING ───────────────────────────────────────── */}
          {slide === "closing" && (
            <div className="text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full mx-auto flex items-center justify-center" style={{ background: C.orange }}>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: C.navy }}>
                    <Handshake size={36} className="text-white" />
                  </div>
                </div>
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold" style={{ color: C.navy }}>
                Vamos Construir <span style={{ color: C.orange }}>Juntos</span>
              </h2>
              <p className="text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: C.textMuted }}>
                Tecnologia BRHUB + Operação Flex Envios = o marketplace logístico mais completo para a comunidade Look China
              </p>
              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6">
                {[
                  { value: "50/50", label: "Rendimentos compartilhados", color: C.navy },
                  { value: "+12%", label: "Margem de agência garantida", color: C.orange },
                  { value: "8 sem", label: "Time-to-market", color: C.amber },
                ].map((item, i) => (
                  <div key={i} className="rounded-2xl p-6 border shadow-sm" style={{ background: C.white, borderColor: C.creamDark }}>
                    <div className="text-3xl font-extrabold" style={{ color: item.color }}>{item.value}</div>
                    <p className="text-sm mt-2" style={{ color: C.textMuted }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <p className="text-sm font-medium" style={{ color: C.textMuted }}>BRHUB Tech/Envios • {new Date().getFullYear()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pitch-fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pitch-fade { animation: pitch-fade-in 0.45s ease-out; }

        @keyframes node-enter {
          0% { opacity: 0; transform: scale(0.5); }
          60% { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .integration-node {
          opacity: 0;
          animation: node-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes arrow-enter {
          0% { opacity: 0; transform: translateX(-16px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .integration-arrow {
          opacity: 0;
          animation: arrow-enter 0.4s ease-out forwards;
        }

        @keyframes line-grow {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .integration-line {
          transform-origin: left center;
          animation: line-grow 0.5s ease-out forwards;
          animation-delay: inherit;
        }

        @keyframes card-slide-up {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .integration-card {
          opacity: 0;
          animation: card-slide-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-full text-white" style={{ background: C.orange }}>
        {icon}
      </div>
      <div>
        <h2 className="text-3xl font-extrabold" style={{ color: C.navy }}>{title}</h2>
        <p style={{ color: C.textMuted }}>{subtitle}</p>
      </div>
    </div>
  );
}

function OrangeMetricCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl p-6 text-center border relative overflow-hidden" style={{ background: C.white, borderColor: C.creamDark }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-40" style={{ background: C.orangeBg }} />
      <div className="mx-auto mb-3" style={{ color: C.orange }}>{icon}</div>
      <div className="text-3xl font-extrabold" style={{ color: C.navy }}>{value}</div>
      <p className="text-sm mt-1" style={{ color: C.textMuted }}>{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const isOrange = index % 2 === 0;
  return (
    <div className="rounded-xl p-6 border transition hover:shadow-md group" style={{ background: C.white, borderColor: C.creamDark }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-white transition group-hover:scale-110" style={{ background: isOrange ? C.orange : C.navy }}>
        {icon}
      </div>
      <h4 className="font-bold mb-1" style={{ color: C.navy }}>{title}</h4>
      <p className="text-sm" style={{ color: C.textMuted }}>{desc}</p>
    </div>
  );
}

function CircleBlock({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div className="text-center min-w-[150px]">
      <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center border-4 mb-3" style={{ borderColor: color, background: C.white }}>
        <span className="font-extrabold text-sm" style={{ color }}>{label.split(" ")[0]}</span>
      </div>
      <p className="font-bold text-sm" style={{ color: C.navy }}>{label}</p>
      <p className="text-xs" style={{ color: C.textMuted }}>{sub}</p>
    </div>
  );
}

function LocationCard({ name, address, type, features }: { name: string; address: string; type: string; features: string[] }) {
  return (
    <div className="rounded-2xl p-8 border transition hover:shadow-md" style={{ background: C.white, borderColor: C.creamDark }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-full" style={{ background: C.orangeBg }}>
          <MapPin style={{ color: C.orange }} />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: C.navy }}>{name}</h3>
          <p className="text-sm" style={{ color: C.textMuted }}>{address}</p>
          <span className="text-xs rounded-full px-3 py-0.5 mt-2 inline-block font-medium" style={{ background: C.orangeBg, color: C.orange }}>{type}</span>
        </div>
      </div>
      <ul className="space-y-2 mt-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMuted }}>
            <CheckCircle2 size={14} style={{ color: C.orange }} className="shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
