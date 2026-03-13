import { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import {
  Truck, Globe, Warehouse, MapPin, Handshake, ChevronRight,
  ChevronLeft, BarChart3, Zap, Shield, Package,
  ArrowRight, Phone, Brain, Mic, Eye, MessageCircle,
  AlertTriangle, Clock, Send, Star, ShieldCheck, DollarSign,
  TrendingDown, TrendingUp, Activity
} from "lucide-react";
import lookChinaProfile from "@/assets/look-china-profile.png";

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

// ─── Colors (editorial pitch deck) ───────────────────────────────────────────
const C = {
  orange: "#f97316",
  orangeLight: "#fdba74",
  orangeBg: "rgba(249,115,22,0.06)",
  orangeBorder: "rgba(249,115,22,0.25)",
  navy: "#1a1a1a",
  navyLight: "#333",
  navyBg: "rgba(26,26,26,0.04)",
  bg: "#e8e2da",
  cardBg: "#eee8e0",
  white: "#f5f0ea",
  text: "#1a1a1a",
  textMuted: "#6b6560",
  amber: "#f59e0b",
  emerald: "#10b981",
  border: "rgba(0,0,0,0.08)",
};

// ─── Scenarios ───────────────────────────────────────────────────────────────
// Físico: R$ 8M/mês ≈ 320k envios/mês (ticket R$ 25)
// Conversão = % do volume físico que migra pro digital

const FISICO_MES = 8; // R$ milhões

const scenarios = {
  bear: {
    name: "Conservador",
    icon: TrendingDown,
    sub: "Crescimento orgânico lento",
    // 0,5% → 3% do volume físico em 12 meses
    conversion: [0.5, 0.7, 1, 1.2, 1.5, 1.8, 2, 2.2, 2.5, 2.7, 2.8, 3],
    color: C.textMuted,
  },
  base: {
    name: "Moderado",
    icon: Activity,
    sub: "Adoção progressiva com incentivos",
    // 1% → 8% do volume físico em 12 meses
    conversion: [1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6, 7, 7.5, 8],
    color: C.orange,
  },
  bull: {
    name: "Acelerado",
    icon: TrendingUp,
    sub: "Migração ativa com equipe dedicada",
    // 2% → 15% do volume físico em 12 meses
    conversion: [2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 15],
    color: C.emerald,
  },
} as const;

type ScenarioKey = keyof typeof scenarios;


// ─── Component ───────────────────────────────────────────────────────────────

export default function PitchPage() {
  const [current, setCurrent] = useState(0);
  const [scenario, setScenario] = useState<ScenarioKey>("base");
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
    <div className="pitch-page min-h-screen select-none overflow-hidden relative" style={{ background: C.bg, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

      {/* Year marker - left side */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40 -rotate-90 text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: C.textMuted }}>
        2026
      </div>

      {/* Slide label - right side */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 -rotate-90 text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: C.textMuted }}>
        Apresentação
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ background: C.border }}>
        <div className="h-full transition-all duration-500" style={{ width: `${((current + 1) / SLIDES.length) * 100}%`, background: C.orange }} />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full" style={{ background: "rgba(26,26,26,0.06)", backdropFilter: "blur(10px)", border: `1px solid ${C.border}` }}>
        <button onClick={() => setCurrent((p) => Math.max(p - 1, 0))} className="p-1 transition disabled:opacity-20" style={{ color: C.navy }} disabled={current === 0}><ChevronLeft size={18} /></button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="transition-all rounded-full" style={{ width: i === current ? 24 : 8, height: 8, background: i === current ? C.orange : C.border }} />
          ))}
        </div>
        <button onClick={() => setCurrent((p) => Math.min(p + 1, SLIDES.length - 1))} className="p-1 transition disabled:opacity-20" style={{ color: C.navy }} disabled={current === SLIDES.length - 1}><ChevronRight size={18} /></button>
        <span className="text-[10px] ml-1 font-mono" style={{ color: C.textMuted }}>{current + 1}/{SLIDES.length}</span>
      </div>

      {/* Slides */}
      <div className="h-screen flex items-center justify-center px-14 py-10">
        <div className="w-full max-w-6xl mx-auto animate-pitch-fade" key={slide}>

          {/* ─── COVER ─────────────────────────────────────────── */}
          {slide === "cover" && (
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 space-y-6">
                <h1 className="text-6xl md:text-7xl font-black leading-[0.95] tracking-tight" style={{ color: C.navy }}>
                  Proposta de<br />
                  <span style={{ color: C.orange }}>Negócio</span>
                </h1>
                <div className="w-16 h-1" style={{ background: C.orange }} />
                <p className="text-lg leading-relaxed max-w-lg" style={{ color: C.textMuted }}>
                  Marketplace logístico integrado com tecnologia de ponta, suporte IA e operação omnichannel — <strong style={{ color: C.navy }}>BRHUB Tech × Flex Envios × Look China</strong>
                </p>
                <button onClick={() => setCurrent(1)} className="text-white px-8 py-3 font-semibold flex items-center gap-2 transition hover:opacity-90" style={{ background: C.orange }}>
                  Iniciar Apresentação <ArrowRight size={18} />
                </button>
                <p className="text-[11px] flex items-center gap-1" style={{ color: C.textMuted }}>
                  <ArrowRight size={11} /> ou Espaço para avançar · F para tela cheia
                </p>
              </div>
              <div className="flex-1 flex justify-center">
                {/* Checkerboard pattern like reference */}
                <div className="grid grid-cols-6 gap-0 w-72 h-72 md:w-80 md:h-80 rounded-sm overflow-hidden">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const row = Math.floor(i / 6);
                    const col = i % 6;
                    const isOrange = (row + col) % 2 === 0;
                    return (
                      <div key={i} style={{ background: isOrange ? C.orange : C.cardBg }} />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── OPPORTUNITY ────────────────────────────────────── */}
          {slide === "opportunity" && (
            <div className="space-y-8">
              <SlideHeader title="A" accent="Oportunidade" tag="Análise de mercado" />

              <div className="grid md:grid-cols-5 gap-8 items-center">
                <div className="md:col-span-2 overflow-hidden border" style={{ borderColor: C.orangeBorder }}>
                  <img src={lookChinaProfile} alt="Look China - Fred China" className="w-full object-cover" />
                </div>
                <div className="md:col-span-3 space-y-5">
                  <h3 className="text-2xl font-black" style={{ color: C.navy }}>Grupo <span style={{ color: C.orange }}>Look China</span></h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                    Liderado por <strong style={{ color: C.navy }}>Fred</strong> (@fred_dayyy), o Look China é um <strong style={{ color: C.orange }}>grande importador com presença física na região do Brás</strong>, na Rua Maria Marcolina 369 (SP) e <strong style={{ color: C.orange }}>1,4 milhão de seguidores</strong> no Instagram.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: "1,4M", label: "Seguidores" },
                      { value: "R$ 8M", label: "Faturamento/mês" },
                      { value: "482+", label: "Conteúdos" },
                    ].map((m, i) => (
                      <CircleMetric key={i} value={m.value} label={m.label} accent={i === 1} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-l-4" style={{ borderColor: C.orange, background: C.cardBg }}>
                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  A <strong style={{ color: C.orange }}>BRHUB Tech/Envios</strong> convida o grupo <strong style={{ color: C.navy }}>Flex Envios</strong> a se tornar parceiro e <strong style={{ color: C.orange }}>operador logístico oficial</strong> do marketplace Look China.
                </p>
              </div>
            </div>
          )}

          {/* ─── PROJECTIONS ───────────────────────────────────── */}
          {slide === "projections" && (() => {
            const sc = scenarios[scenario];
            const conversionData = sc.conversion;
            const digitalData = conversionData.map((pct: number) => parseFloat(((pct / 100) * FISICO_MES).toFixed(3)));

            const projChart: { series: ApexOptions["series"]; options: ApexOptions } = {
              series: [
                { name: "Físico (R$ mi)", data: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
                { name: "Digital (R$ mi)", data: digitalData as unknown as number[] },
              ],
              options: {
                chart: { type: "area", height: 220, toolbar: { show: false }, background: "transparent", fontFamily: "'Plus Jakarta Sans', sans-serif" },
                colors: [C.navy, sc.color],
                fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } },
                stroke: { curve: "smooth", width: 2.5 },
                xaxis: { categories: monthLabels, labels: { style: { colors: C.textMuted, fontSize: "9px" } } },
                yaxis: { labels: { style: { colors: C.textMuted, fontSize: "10px" }, formatter: (v: number) => `R$${v}M` } },
                grid: { borderColor: C.border, strokeDashArray: 4 },
                tooltip: { theme: "light" },
                legend: { labels: { colors: C.text }, fontSize: "10px" },
                dataLabels: { enabled: false },
              },
            };

            const convChart: { series: ApexOptions["series"]; options: ApexOptions } = {
              series: [{ name: "% Conversão", data: conversionData as unknown as number[] }],
              options: {
                chart: { type: "bar", height: 220, toolbar: { show: false }, background: "transparent" },
                colors: [sc.color],
                xaxis: { categories: monthLabels, labels: { style: { colors: C.textMuted, fontSize: "9px" } } },
                yaxis: { max: scenario === "bull" ? 25 : 12, labels: { style: { colors: C.textMuted, fontSize: "10px" }, formatter: (v: number) => `${v}%` } },
                grid: { borderColor: C.border, strokeDashArray: 4 },
                plotOptions: { bar: { borderRadius: 3, columnWidth: "50%" } },
                dataLabels: { enabled: false },
                tooltip: { theme: "light", y: { formatter: (v: number) => `${v}% = R$ ${((v / 100) * 8).toFixed(2)}M` } },
              },
            };

            return (
            <div className="space-y-3">
              <SlideHeader title="Cenários de" accent="mercado" tag="Dados financeiros" />

              {/* Scenario selector - compact */}
              <div className="flex gap-2">
                {(Object.keys(scenarios) as ScenarioKey[]).map((key) => {
                  const s = scenarios[key];
                  const active = scenario === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setScenario(key)}
                      className="flex-1 py-2 px-3 text-left border-2 transition-all"
                      style={{
                        background: active ? (key === "bull" ? C.emerald : key === "bear" ? C.navy : C.orange) : C.white,
                        borderColor: active ? (key === "bull" ? C.emerald : key === "bear" ? C.navy : C.orange) : C.border,
                        color: active ? "white" : C.navy,
                      }}
                    >
                      <div className="font-black text-xs flex items-center gap-1.5"><s.icon size={13} /> {s.name}</div>
                      <div className="text-[10px]" style={{ opacity: 0.7 }}>
                        {s.conversion[0]}% → {s.conversion[11]}%
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold text-[10px] mb-0 uppercase tracking-wider" style={{ color: C.textMuted }}>Físico vs Digital</h4>
                  <ReactApexChart options={projChart.options} series={projChart.series} type="area" height={170} />
                </div>
                <div className="p-3 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold text-[10px] mb-0 uppercase tracking-wider" style={{ color: C.textMuted }}>Conversão (%)</h4>
                  <ReactApexChart options={convChart.options} series={convChart.series} type="bar" height={170} />
                </div>
              </div>

              {/* 3 scenario cards side by side - compact */}
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(scenarios) as ScenarioKey[]).map((key) => {
                  const s = scenarios[key];
                  const digitalArr = s.conversion.map((pct: number) => parseFloat(((pct / 100) * FISICO_MES).toFixed(3)));
                  const last = digitalArr[11];
                  const envios12 = Math.round((last * 1_000_000) / 25);
                  const total = digitalArr.reduce((sum: number, v: number) => sum + Math.round((v * 1_000_000) / 25), 0);
                  const isActive = scenario === key;
                  return (
                    <div
                      key={key}
                      className="p-3 border cursor-pointer transition-all"
                      onClick={() => setScenario(key)}
                      style={{
                        background: isActive ? C.orangeBg : C.white,
                        borderColor: isActive ? s.color : C.border,
                        borderWidth: isActive ? 2 : 1,
                      }}
                    >
                      <div className="font-black text-[11px] mb-1.5 flex items-center gap-1" style={{ color: s.color }}><s.icon size={12} /> {s.name}</div>
                      <div className="space-y-1 text-[10px]" style={{ color: C.textMuted }}>
                        <div className="flex justify-between">
                          <span>Digital Mês 12</span>
                          <strong style={{ color: s.color }}>R$ {last < 1 ? `${(last * 1000).toFixed(0)}k` : `${last.toFixed(2)}M`}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Envios Mês 12</span>
                          <strong style={{ color: C.navy }}>{(envios12 / 1000).toFixed(1)}k</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Ano 1</span>
                          <strong style={{ color: C.navy }}>~{(total / 1000).toFixed(0)}k</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2 border-l-4 text-[10px]" style={{ borderColor: sc.color, background: C.cardBg, color: C.textMuted }}>
                Volume físico <strong>R$ 8M/mês</strong> · Ticket <strong>R$ 25/etiq</strong> · {sc.name}: <strong style={{ color: sc.color }}>{sc.conversion[0]}% → {sc.conversion[11]}%</strong> em 12 meses
              </div>
            </div>
            );
          })()}

          {/* ─── INTEGRATION ───────────────────────────────────── */}
          {slide === "integration" && (
            <div className="space-y-8">
              <SlideHeader title="Arquitetura de" accent="integração" tag="Fluxo técnico" />
              <div className="p-10 border" style={{ background: C.white, borderColor: C.border }}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <IntegrationNode label="Flex Envios" sub="Disponibiliza API" color={C.amber} />
                  <div className="hidden md:flex items-center gap-1">
                    <div className="h-[2px] w-16" style={{ background: C.orange }} />
                    <ArrowRight size={24} style={{ color: C.orange }} />
                  </div>
                  <IntegrationNode label="BRHUB Tech" sub="Desenvolve & Integra" color={C.orange} />
                  <div className="hidden md:flex items-center gap-1">
                    <div className="h-[2px] w-16" style={{ background: C.navy }} />
                    <ArrowRight size={24} style={{ color: C.navy }} />
                  </div>
                  <IntegrationNode label="Look China" sub="Marca própria no Marketplace" color={C.navy} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="p-6 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: C.orange }}>
                    <Globe size={16} /> Plataforma Digital
                  </h4>
                  <ul className="space-y-2 text-sm" style={{ color: C.textMuted }}>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Nova plataforma integrada com contrato Flex</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Plataforma personalizada Look China</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Desenvolvimento 100% BRHUB</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Painel próprio para o lojista</li>
                  </ul>
                </div>
                <div className="p-6 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: C.navy }}>
                    <Warehouse size={16} /> Sistema FULL (Galpão)
                  </h4>
                  <ul className="space-y-2 text-sm" style={{ color: C.textMuted }}>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Operação completa no galpão do parceiro</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Desenvolvimento dedicado se necessário</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Integração com estoque e expedição</li>
                    <li className="flex gap-2"><span style={{ color: C.orange }}>●</span> Gestão de coleta e despacho automatizada</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ─── PLATFORM ──────────────────────────────────────── */}
          {slide === "platform" && (
            <div className="space-y-8">
              <SlideHeader title="Plataforma" accent="BRHUB" tag="Recursos principais" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: <Package size={22} />, title: "Emissão de Etiquetas", desc: "Cotação multi-transportadora, etiqueta em segundos" },
                  { icon: <Truck size={22} />, title: "Rastreamento Inteligente", desc: "Acompanhamento em tempo real com notificações automáticas" },
                  { icon: <BarChart3 size={22} />, title: "Painel de Análises", desc: "Visão 360° de envios, custos e desempenho" },
                  { icon: <Shield size={22} />, title: "Gestão Financeira", desc: "Faturas, créditos pré-pagos e extrato completo" },
                  { icon: <Globe size={22} />, title: "Integrações", desc: "API aberta para conectar qualquer plataforma" },
                  { icon: <Warehouse size={22} />, title: "Galpão Completo", desc: "Sistema completo de logística e expedição" },
                ].map((f, i) => (
                  <div key={i} className="p-5 border transition hover:border-orange-300 group" style={{ background: C.white, borderColor: C.border }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3 border-2" style={{ borderColor: i % 2 === 0 ? C.orange : C.navy, color: i % 2 === 0 ? C.orange : C.navy }}>
                      {f.icon}
                    </div>
                    <h4 className="font-bold text-sm mb-1" style={{ color: C.navy }}>{f.title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── AI FEATURES ───────────────────────────────────── */}
          {slide === "ai-features" && (
            <div className="space-y-6">
              <SlideHeader title="Ecossistema de" accent="IA" tag="Inteligência artificial" />

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: <Brain size={20} />, name: "Google Gemini", desc: "Raciocínio multimodal. Texto, imagens e contextos massivos." },
                  { icon: <Eye size={20} />, name: "OpenAI GPT-5", desc: "Compreensão de linguagem, sentimento e respostas empáticas." },
                  { icon: <Mic size={20} />, name: "ElevenLabs", desc: "Voz indistinguível de humano. Áudios gerados em tempo real." },
                ].map((p, i) => (
                  <div key={i} className="p-4 border flex items-start gap-3" style={{ background: C.white, borderColor: C.border }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: C.orange, color: C.orange }}>
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: C.navy }}>{p.name}</h4>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.textMuted }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-5 gap-5">
                <div className="md:col-span-3 p-6 space-y-4 border-2" style={{ background: C.navy, borderColor: C.navy, color: "white" }}>
                  <h3 className="text-lg font-bold flex items-center gap-2"><MessageCircle size={20} style={{ color: C.orangeLight }} /> WhatsApp <span style={{ color: C.orange }}>Agente IA</span></h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      "Rastreamento automático por código",
                      "Resolução 24/7 sem intervenção",
                      "Detecção de sentimento inteligente",
                      "Áudio humanizado via ElevenLabs",
                      "Notificações proativas de entrega",
                      "Fluxo de suporte automático",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-white/90 text-xs">
                        <span style={{ color: C.orange }}>●</span> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  {[
                    { icon: <Star size={14} />, title: "Sinalização Inteligente", desc: "Alertas de atraso e entrega falhada. IA sugere ações." },
                    { icon: <Phone size={14} />, title: "Gestão WhatsApp", desc: "Conversas, chamados, modelos de mensagem e métricas." },
                    { icon: <Zap size={14} />, title: "Ferramentas de IA", desc: "Cotação, rastreio e busca acionados via IA." },
                  ].map((item, i) => (
                    <div key={i} className="p-4 border" style={{ background: C.white, borderColor: C.border }}>
                      <h4 className="font-bold text-xs mb-1 flex items-center gap-1.5" style={{ color: C.navy }}>
                        <span style={{ color: C.orange }}>{item.icon}</span> {item.title}
                      </h4>
                      <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATIONS ─────────────────────────────────── */}
          {slide === "notifications" && (
            <div className="space-y-6">
              <SlideHeader title="Notificações" accent="proativas" tag="Automação" />

              <div className="p-6 border-2" style={{ background: C.navy, borderColor: C.navy, color: "white" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: C.orange }}>
                    <AlertTriangle size={24} style={{ color: C.orange }} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold flex items-center gap-2"><Brain size={16} style={{ color: C.orangeLight }} /> Algoritmo <span style={{ color: C.orange }}>Preditivo</span> de Atraso</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Monitora cada objeto em trânsito. A cada 15 min, cruza previsão com horário atual. Se detecta atraso — o cliente recebe notificação via WhatsApp <strong style={{ color: C.orangeLight }}>antes de perceber</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: <Send size={18} />, title: "Etiqueta Criada", desc: "Destinatário recebe código de rastreio e previsão." },
                  { icon: <Package size={18} />, title: "Objeto Postado", desc: "Confirmação de entrega à transportadora." },
                  { icon: <Truck size={18} />, title: "Saiu para Entrega", desc: "Notificação quando entra na rota final." },
                  { icon: <Clock size={18} />, title: "Aguardando Retirada", desc: "Alerta de disponibilidade em agência." },
                  { icon: <AlertTriangle size={18} />, title: "Alerta de Atraso", desc: "Aviso proativo antes do cliente perceber." },
                  { icon: <Star size={18} />, title: "Avaliação Pós-Entrega", desc: "Feedback para medir NPS e qualidade." },
                ].map((n, i) => (
                  <div key={i} className="p-4 border flex gap-3" style={{ background: C.white, borderColor: C.border }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: C.orange, color: C.orange }}>
                      {n.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs mb-0.5" style={{ color: C.navy }}>{n.title}</h4>
                      <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── COLLECTION POINTS ─────────────────────────────── */}
          {slide === "collection-points" && (
            <div className="space-y-8">
              <SlideHeader title="Pontos de" accent="coleta" tag="Localização" />
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { name: "Look China", address: "Rua Carnot", type: "Principal", features: ["Recebimento de encomendas", "Atendimento ao lojista", "Etiquetagem e despacho", "Suporte presencial"] },
                  { name: "Look China Shopping", address: "Rua Maria Marcolina", type: "Secundário", features: ["Coleta centralizada do shopping", "Alto volume de lojistas", "Expedição diária", "Integração com a plataforma"] },
                ].map((loc, i) => (
                  <div key={i} className="p-7 border" style={{ background: C.white, borderColor: C.border }}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: C.orange, color: C.orange }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: C.navy }}>{loc.name}</h3>
                        <p className="text-xs" style={{ color: C.textMuted }}>{loc.address}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 mt-1 inline-block border" style={{ borderColor: C.orangeBorder, color: C.orange }}>{loc.type}</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {loc.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm" style={{ color: C.textMuted }}>
                          <span style={{ color: C.orange }}>●</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="p-4 text-center border-l-4" style={{ borderColor: C.orange, background: C.cardBg }}>
                <p className="text-sm" style={{ color: C.navy }}>
                  <MapPin size={16} className="inline mr-1" style={{ color: C.orange }} />
                  Dois pontos estratégicos = <strong>maior cobertura</strong> e <strong>conveniência</strong>
                </p>
              </div>
            </div>
          )}

          {/* ─── TIMELINE ──────────────────────────────────────── */}
          {slide === "timeline" && (
            <div className="space-y-8">
              <SlideHeader title="Algumas" accent="etapas" tag="Cronograma" />
              {/* Horizontal timeline like reference "Some milestones" */}
              <div className="flex gap-3">
                {[
                  { phase: "Sem 1", title: "Configuração" },
                  { phase: "Sem 2", title: "Plataforma" },
                  { phase: "Sem 3", title: "IA & Automação" },
                  { phase: "Sem 4", title: "Lançamento" },
                ].map((p, i) => (
                  <div key={i} className="flex-1 relative">
                    <div className="py-2 px-3 text-white text-xs font-bold text-center" style={{ background: C.orange, clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)", marginLeft: i === 0 ? 0 : -6 }}>
                      {p.phase}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { items: ["Configuração API Flex Envios", "Ambiente de desenvolvimento", "Plataforma base Look China"] },
                  { items: ["Painel do lojista", "Emissão de etiquetas integrada", "Rastreamento automático"] },
                  { items: ["Agente WhatsApp IA", "Notificações automáticas", "Fluxo de suporte"] },
                  { items: ["Ativação Carnot & Marcolina", "Sistema completo no galpão", "Início da operação"] },
                ].map((col, i) => (
                  <div key={i} className="space-y-2">
                    {col.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs" style={{ color: C.textMuted }}>
                        <span className="mt-0.5" style={{ color: C.orange }}>●</span>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── REVENUE ─────────────────────────────────────── */}
          {slide === "revenue" && (
            <div className="space-y-6">
              <SlideHeader title="Modelo de" accent="receita" tag="Modelo de negócio" />

              <div className="p-5 border-2" style={{ background: C.navy, borderColor: C.navy, color: "white" }}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: C.orange }}>
                    <ShieldCheck size={22} style={{ color: C.orange }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Zero Risco de <span style={{ color: C.orange }}>Inadimplência</span> para a Flex</h4>
                    <p className="text-white/75 text-xs mt-1 leading-relaxed">
                      A <strong className="text-white">BRHUB assume 100% da cobrança e do risco</strong>. A Flex recebe repasses mensais com margem já calculada.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { value: "50%", label: "BRHUB Tech", sub: "do lucro das etiquetas", color: C.navy, items: ["Infraestrutura tecnológica", "Assume cobrança e inadimplência", "Suporte com IA 24/7", "Calcula e repassa margens"] },
                  { value: "50%", label: "Flex Envios", sub: "do lucro das etiquetas", color: C.orange, items: ["Operação logística", "API de contratos", "Recebe repasse sem risco", "Rede de distribuição"] },
                  { value: "+12%", label: "Margem Agência", sub: "sobre volume postado", color: C.emerald, items: ["Receita da Flex sobre postagem", "Receita garantida", "Independe do marketplace", "Recorrente mensal"] },
                ].map((card, i) => (
                  <div key={i} className="p-5 border relative" style={{ background: C.white, borderColor: C.border }}>
                    <div className="absolute top-0 left-0 w-full h-1" style={{ background: card.color }} />
                    <div className="text-2xl font-black mb-0.5" style={{ color: card.color }}>{card.value}</div>
                    <div className="font-bold text-sm" style={{ color: card.color }}>{card.label}</div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 mt-1 mb-3 inline-block border" style={{ borderColor: `${card.color}40`, color: card.color }}>{card.sub}</span>
                    <ul className="space-y-1.5">
                      {card.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs" style={{ color: C.textMuted }}>
                          <span className="mt-0.5" style={{ color: card.color }}>●</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="p-5 border" style={{ background: C.white, borderColor: C.border }}>
                <h4 className="font-bold text-xs mb-3 uppercase tracking-wider" style={{ color: C.navy }}>Fluxo de Pagamento Mensal</h4>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { step: "1", title: "Cliente usa", desc: "Emite etiquetas durante o mês", icon: <Package size={18} /> },
                    { step: "2", title: "BRHUB cobra", desc: "Fechamento mensal consolidado", icon: <DollarSign size={18} /> },
                    { step: "3", title: "Calcula margem", desc: "Divisão 50/50 apurada", icon: <BarChart3 size={18} /> },
                    { step: "4", title: "Repassa à Flex", desc: "Flex recebe + 12% agência", icon: <Handshake size={18} /> },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-3" style={{ background: i === 3 ? C.orangeBg : C.cardBg }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 text-white text-xs font-bold" style={{ background: i === 3 ? C.orange : C.navy }}>
                        {item.step}
                      </div>
                      <div className="mb-0.5" style={{ color: i === 3 ? C.orange : C.navy }}>{item.icon}</div>
                      <h5 className="font-bold text-xs" style={{ color: C.text }}>{item.title}</h5>
                      <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── CLOSING ───────────────────────────────────────── */}
          {slide === "closing" && (
            <div className="text-center space-y-8">
              <h2 className="text-5xl md:text-7xl font-black tracking-tight" style={{ color: C.navy }}>
                Vamos construir<br /><span style={{ color: C.orange }}>juntos</span>
              </h2>
              <div className="w-16 h-1 mx-auto" style={{ background: C.orange }} />
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: C.textMuted }}>
                Tecnologia BRHUB + Operação Flex Envios = a plataforma logística mais completa para a comunidade Look China
              </p>
              <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto pt-4">
                {[
                  { value: "50/50", label: "Rendimentos compartilhados", color: C.navy },
                  { value: "+12%", label: "Margem de agência garantida", color: C.orange },
                  { value: "4 sem", label: "Prazo de entrega", color: C.amber },
                ].map((item, i) => (
                  <CircleMetric key={i} value={item.value} label={item.label} accent={i === 1} color={item.color} />
                ))}
              </div>
              <p className="text-xs font-medium pt-4" style={{ color: C.textMuted }}>BRHUB Tech/Envios • {new Date().getFullYear()}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pitch-fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pitch-fade { animation: pitch-fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SlideHeader({ title, accent, tag }: { title: string; accent: string; tag: string }) {
  return (
    <div className="flex items-start justify-between">
      <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>
        {title} <span style={{ color: C.orange }}>{accent}</span>
      </h2>
      <span className="text-xs font-semibold border-b-2 pb-0.5 shrink-0 mt-2" style={{ borderColor: C.orange, color: C.navy }}>{tag}</span>
    </div>
  );
}

function CircleMetric({ value, label, accent = false, color }: { value: string; label: string; accent?: boolean; color?: string }) {
  const borderColor = color || (accent ? C.orange : C.border);
  const textColor = color || (accent ? C.orange : C.navy);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 mb-2" style={{ borderColor }}>
        <span className="text-lg font-black" style={{ color: textColor }}>{value}</span>
      </div>
      <p className="text-xs font-medium" style={{ color: C.textMuted }}>{label}</p>
    </div>
  );
}

function IntegrationNode({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div className="text-center min-w-[140px]">
      <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 mb-2" style={{ borderColor: color, background: C.white }}>
        <span className="font-black text-xs" style={{ color }}>{label.split(" ")[0]}</span>
      </div>
      <p className="font-bold text-sm" style={{ color: C.navy }}>{label}</p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>{sub}</p>
    </div>
  );
}
