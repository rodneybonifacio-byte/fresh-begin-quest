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

// monthLabels moved inline as mobileLabels

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
// Físico: R$ 8M/mês em faturamento ≈ 320k envios/mês (ticket médio R$ 25)
// Conversão = % do volume físico que migra pro digital

const FISICO_FAT = 8; // R$ milhões/mês (faturamento)
const TICKET_MEDIO = 25; // R$ por etiqueta
const FISICO_ENVIOS = (FISICO_FAT * 1_000_000) / TICKET_MEDIO; // ~320.000 envios/mês

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

      {/* Year marker - left side (hidden on mobile) */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-40 -rotate-90 text-[10px] font-bold tracking-[0.3em] uppercase hidden md:block" style={{ color: C.textMuted }}>
        2026
      </div>

      {/* Slide label - right side (hidden on mobile) */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 -rotate-90 text-[10px] font-bold tracking-[0.3em] uppercase hidden md:block" style={{ color: C.textMuted }}>
        Apresentação
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ background: C.border }}>
        <div className="h-full transition-all duration-500" style={{ width: `${((current + 1) / SLIDES.length) * 100}%`, background: C.orange }} />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 rounded-full" style={{ background: "rgba(26,26,26,0.06)", backdropFilter: "blur(10px)", border: `1px solid ${C.border}` }}>
        <button onClick={() => setCurrent((p) => Math.max(p - 1, 0))} className="p-1 transition disabled:opacity-20" style={{ color: C.navy }} disabled={current === 0}><ChevronLeft size={16} /></button>
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="transition-all rounded-full" style={{ width: i === current ? 18 : 6, height: 6, background: i === current ? C.orange : C.border }} />
          ))}
        </div>
        <button onClick={() => setCurrent((p) => Math.min(p + 1, SLIDES.length - 1))} className="p-1 transition disabled:opacity-20" style={{ color: C.navy }} disabled={current === SLIDES.length - 1}><ChevronRight size={16} /></button>
        <span className="text-[9px] ml-0.5 font-mono" style={{ color: C.textMuted }}>{current + 1}/{SLIDES.length}</span>
      </div>

      {/* Slides */}
      <div className="h-screen flex items-start md:items-center justify-center px-4 md:px-14 pt-6 pb-16 md:py-10 overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto animate-pitch-fade" key={slide}>

          {/* ─── COVER ─────────────────────────────────────────── */}
          {slide === "cover" && (
            <div className="flex flex-col items-center md:flex-row gap-8 md:gap-16">
              <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight" style={{ color: C.navy }}>
                  Proposta de<br />
                  <span style={{ color: C.orange }}>Negócio</span>
                </h1>
                <div className="w-16 h-1 mx-auto md:mx-0" style={{ background: C.orange }} />
                <p className="text-sm md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0" style={{ color: C.textMuted }}>
                  Marketplace logístico integrado com tecnologia de ponta, suporte IA e operação omnichannel — <strong style={{ color: C.navy }}>BRHUB Tech × Flex Envios × Look China</strong>
                </p>
                <button onClick={() => setCurrent(1)} className="text-white px-6 py-2.5 md:px-8 md:py-3 font-semibold flex items-center gap-2 transition hover:opacity-90 mx-auto md:mx-0 text-sm md:text-base" style={{ background: C.orange }}>
                  Iniciar <ArrowRight size={16} />
                </button>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="grid grid-cols-6 gap-0 w-48 h-48 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-sm overflow-hidden">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const row = Math.floor(i / 6);
                    const col = i % 6;
                    const isOrange = (row + col) % 2 === 0;
                    return <div key={i} style={{ background: isOrange ? C.orange : C.cardBg }} />;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── OPPORTUNITY ────────────────────────────────────── */}
          {slide === "opportunity" && (
            <div className="space-y-5 md:space-y-8">
              <SlideHeader title="A" accent="Oportunidade" tag="Análise de mercado" />

              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:gap-8 items-center">
                <div className="md:col-span-2 overflow-hidden border max-w-[280px] mx-auto md:max-w-none" style={{ borderColor: C.orangeBorder }}>
                  <img src={lookChinaProfile} alt="Look China - Fred China" className="w-full object-cover" />
                </div>
                <div className="md:col-span-3 space-y-4 md:space-y-5">
                  <h3 className="text-xl md:text-2xl font-black text-center md:text-left" style={{ color: C.navy }}>Grupo <span style={{ color: C.orange }}>Look China</span></h3>
                  <p className="text-xs md:text-sm leading-relaxed" style={{ color: C.textMuted }}>
                    Liderado por <strong style={{ color: C.navy }}>Fred</strong> (@fred_dayyy), o Look China é um <strong style={{ color: C.orange }}>grande importador com presença física na região do Brás</strong>, na Rua Maria Marcolina 369 (SP) e <strong style={{ color: C.orange }}>1,4 milhão de seguidores</strong> no Instagram.
                  </p>
                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {[
                      { value: "1,4M", label: "Seguidores" },
                      { value: "R$ 8M", label: "Fat./mês" },
                      { value: "482+", label: "Conteúdos" },
                    ].map((m, i) => (
                      <CircleMetric key={i} value={m.value} label={m.label} accent={i === 1} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-l-4" style={{ borderColor: C.orange, background: C.cardBg }}>
                <p className="text-xs md:text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  A <strong style={{ color: C.orange }}>BRHUB Tech/Envios</strong> convida o grupo <strong style={{ color: C.navy }}>Flex Envios</strong> a se tornar parceiro e <strong style={{ color: C.orange }}>operador logístico oficial</strong> do marketplace Look China.
                </p>
              </div>
            </div>
          )}

          {/* ─── PROJECTIONS ───────────────────────────────────── */}
          {slide === "projections" && (() => {
            const sc = scenarios[scenario];
            const conversionData = sc.conversion;
            const digitalFat = conversionData.map((pct: number) => parseFloat(((pct / 100) * FISICO_FAT).toFixed(3)));
            const enviosMes = conversionData.map((pct: number) => Math.round((pct / 100) * FISICO_ENVIOS));
            const fatMesR$ = enviosMes.map((v: number) => v * TICKET_MEDIO);
            const enviosDia = enviosMes.map((v: number) => Math.round(v / 26));
            let acumEnv = 0;
            const acumuladosEnv = enviosMes.map((v: number) => { acumEnv += v; return acumEnv; });
            let acumFat = 0;
            const acumuladosFat = fatMesR$.map((v: number) => { acumFat += v; return acumFat; });

            const chartHeight = 180;
            const mobileLabels = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];

            const enviosChart: { series: ApexOptions["series"]; options: ApexOptions } = {
              series: [{ name: "Envios/mês", data: enviosMes }],
              options: {
                chart: { type: "bar", height: chartHeight, toolbar: { show: false }, background: "transparent" },
                colors: [sc.color],
                xaxis: { categories: mobileLabels, labels: { style: { colors: C.textMuted, fontSize: "8px" }, rotate: -45 } },
                yaxis: { labels: { style: { colors: C.textMuted, fontSize: "9px" }, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}` } },
                grid: { borderColor: C.border, strokeDashArray: 4 },
                plotOptions: { bar: { borderRadius: 2, columnWidth: "60%" } },
                dataLabels: { enabled: false },
                tooltip: { theme: "light", y: { formatter: (v: number) => `${v.toLocaleString('pt-BR')} envios` } },
              },
            };

            const fatChart: { series: ApexOptions["series"]; options: ApexOptions } = {
              series: [{ name: "Faturamento (R$)", data: digitalFat.map((v: number) => parseFloat((v * 1000).toFixed(0))) }],
              options: {
                chart: { type: "area", height: chartHeight, toolbar: { show: false }, background: "transparent" },
                colors: [sc.color],
                fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } },
                stroke: { curve: "smooth", width: 2 },
                xaxis: { categories: mobileLabels, labels: { style: { colors: C.textMuted, fontSize: "8px" }, rotate: -45 } },
                yaxis: { labels: { style: { colors: C.textMuted, fontSize: "9px" }, formatter: (v: number) => `R$${v}k` } },
                grid: { borderColor: C.border, strokeDashArray: 4 },
                dataLabels: { enabled: false },
                tooltip: { theme: "light", y: { formatter: (v: number) => `R$ ${v.toLocaleString('pt-BR')}k` } },
              },
            };

            const fmtR$ = (v: number) => v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : `R$ ${(v / 1000).toFixed(0)}k`;

            return (
            <div className="space-y-3">
              <SlideHeader title="Projeção de" accent="envios e faturamento" tag="Cenários" />

              {/* Scenario selector — vertical on mobile */}
              <div className="flex flex-col md:flex-row gap-1.5 md:gap-2">
                {(Object.keys(scenarios) as ScenarioKey[]).map((key) => {
                  const s = scenarios[key];
                  const active = scenario === key;
                  const sEnvios12 = Math.round((s.conversion[11] / 100) * FISICO_ENVIOS);
                  const sFat12 = sEnvios12 * TICKET_MEDIO;
                  return (
                    <button
                      key={key}
                      onClick={() => setScenario(key)}
                      className="flex-1 py-2 px-3 text-left border-2 transition-all flex items-center md:block gap-3"
                      style={{
                        background: active ? (key === "bull" ? C.emerald : key === "bear" ? C.navy : C.orange) : C.white,
                        borderColor: active ? (key === "bull" ? C.emerald : key === "bear" ? C.navy : C.orange) : C.border,
                        color: active ? "white" : C.navy,
                      }}
                    >
                      <div className="font-black text-xs flex items-center gap-1.5 shrink-0"><s.icon size={13} /> {s.name}</div>
                      <div className="text-[10px] md:mt-0.5" style={{ opacity: 0.8 }}>
                        {s.conversion[11]}% → <strong>{(sEnvios12/1000).toFixed(1)}k env.</strong> · {fmtR$(sFat12)}/mês
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Charts: stacked on mobile, side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <div className="p-2 md:p-3 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold text-[10px] mb-0 uppercase tracking-wider" style={{ color: C.textMuted }}>Volume de envios/mês</h4>
                  <ReactApexChart options={enviosChart.options} series={enviosChart.series} type="bar" height={chartHeight} />
                </div>
                <div className="p-2 md:p-3 border" style={{ background: C.white, borderColor: C.border }}>
                  <h4 className="font-bold text-[10px] mb-0 uppercase tracking-wider" style={{ color: C.textMuted }}>Faturamento digital (R$ mil)</h4>
                  <ReactApexChart options={fatChart.options} series={fatChart.series} type="area" height={chartHeight} />
                </div>
              </div>

              {/* Mobile: cards instead of table / Desktop: table */}
              {/* Desktop table */}
              <div className="hidden md:block border overflow-hidden" style={{ background: C.white, borderColor: C.border }}>
                <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.cardBg }}>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider" style={{ color: C.navy }}>
                    {sc.name} ({sc.conversion[0]}% → {sc.conversion[11]}% do volume físico)
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 font-semibold border" style={{ borderColor: C.orangeBorder, color: C.orange }}>Físico: 320k envios · R$ 8M/mês</span>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr style={{ background: C.cardBg }}>
                      <th className="px-2 py-1.5 text-left font-semibold" style={{ color: C.textMuted }}>Mês</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: sc.color }}>% Digital</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: C.orange }}>Envios/mês</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: C.emerald }}>Envios/dia</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: C.navy }}>Faturamento</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: C.textMuted }}>Envios acum.</th>
                      <th className="px-2 py-1.5 text-right font-semibold" style={{ color: C.textMuted }}>Fat. acum.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 2, 5, 8, 11].map((i) => {
                      const isLast = i === 11;
                      return (
                        <tr key={i} className="border-t" style={{ borderColor: C.border, background: isLast ? C.orangeBg : 'transparent' }}>
                          <td className="px-2 py-1 font-semibold" style={{ color: C.text }}>Mês {i + 1}</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: sc.color }}>{conversionData[i]}%</td>
                          <td className="px-2 py-1 text-right font-bold" style={{ color: C.orange }}>{enviosMes[i].toLocaleString('pt-BR')}</td>
                          <td className="px-2 py-1 text-right" style={{ color: C.emerald }}>~{enviosDia[i].toLocaleString('pt-BR')}</td>
                          <td className="px-2 py-1 text-right font-semibold" style={{ color: C.navy }}>{fmtR$(fatMesR$[i])}</td>
                          <td className="px-2 py-1 text-right" style={{ color: C.textMuted }}>{acumuladosEnv[i].toLocaleString('pt-BR')}</td>
                          <td className="px-2 py-1 text-right" style={{ color: C.textMuted }}>{fmtR$(acumuladosFat[i])}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: compact cards */}
              <div className="md:hidden space-y-1.5">
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: C.cardBg }}>
                  <h4 className="font-bold text-[10px] uppercase tracking-wider" style={{ color: C.navy }}>
                    {sc.name} · {sc.conversion[0]}% → {sc.conversion[11]}%
                  </h4>
                </div>
                {[0, 2, 5, 8, 11].map((i) => {
                  const isLast = i === 11;
                  return (
                    <div key={i} className="p-2.5 border flex items-center justify-between" style={{ background: isLast ? C.orangeBg : C.white, borderColor: isLast ? C.orangeBorder : C.border }}>
                      <div>
                        <div className="font-bold text-xs" style={{ color: C.text }}>Mês {i + 1} <span className="font-normal text-[10px]" style={{ color: sc.color }}>({conversionData[i]}%)</span></div>
                        <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>~{enviosDia[i].toLocaleString('pt-BR')}/dia · acum. {(acumuladosEnv[i]/1000).toFixed(0)}k</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs" style={{ color: C.orange }}>{(enviosMes[i]/1000).toFixed(1)}k env.</div>
                        <div className="font-semibold text-[10px]" style={{ color: C.navy }}>{fmtR$(fatMesR$[i])}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary metrics */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-2">
                {[
                  { label: "Envios Mês 12", value: `${(enviosMes[11]/1000).toFixed(1)}k`, color: C.orange },
                  { label: "Envios/dia", value: `~${enviosDia[11]}`, color: C.emerald },
                  { label: "Fat. Mês 12", value: fmtR$(fatMesR$[11]), color: C.navy },
                  { label: "Envios Ano 1", value: `${(acumuladosEnv[11]/1000).toFixed(0)}k`, color: sc.color },
                  { label: "Fat. Ano 1", value: fmtR$(acumuladosFat[11]), color: C.amber },
                ].map((m, i) => (
                  <div key={i} className={`text-center p-2 border ${i >= 3 ? 'hidden md:block' : ''}`} style={{ background: C.white, borderColor: C.border }}>
                    <div className="text-sm md:text-base font-black" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[8px] md:text-[9px] font-medium" style={{ color: C.textMuted }}>{m.label}</div>
                  </div>
                ))}
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
