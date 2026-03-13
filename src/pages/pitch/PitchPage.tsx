import { useState, useEffect } from "react";
import { ApexOptions } from "apexcharts";
import ReactApexChart from "react-apexcharts";
import {
  Truck, Bot, Globe, Warehouse, MapPin, Handshake, ChevronRight,
  ChevronLeft, BarChart3, Zap, Shield, Package, TrendingUp,
  Building2, ArrowRight, CheckCircle2, Sparkles, Phone
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const SLIDES = [
  "cover",
  "opportunity",
  "platform",
  "ai-features",
  "integration",
  "collection-points",
  "revenue",
  "fairness",
  "projections",
  "timeline",
  "closing",
] as const;

const monthLabels = ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6", "Mês 7", "Mês 8", "Mês 9", "Mês 10", "Mês 11", "Mês 12"];

// ─── Chart configs ───────────────────────────────────────────────────────────

const projectionChart: { series: ApexOptions["series"]; options: ApexOptions } = {
  series: [
    { name: "Envios Estimados", data: [800, 1400, 2200, 3200, 4500, 5800, 7200, 8800, 10500, 12500, 14800, 17500] },
    { name: "Faturamento (R$ mil)", data: [12, 22, 35, 52, 72, 93, 115, 140, 168, 200, 237, 280] },
  ],
  options: {
    chart: { type: "area", height: 340, toolbar: { show: false }, background: "transparent", fontFamily: "Inter, sans-serif" },
    colors: ["#6366f1", "#10b981"],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] } },
    stroke: { curve: "smooth", width: 3 },
    xaxis: { categories: monthLabels, labels: { style: { colors: "#94a3b8" } } },
    yaxis: { labels: { style: { colors: "#94a3b8" } } },
    grid: { borderColor: "#1e293b", strokeDashArray: 4 },
    tooltip: { theme: "dark" },
    legend: { labels: { colors: "#e2e8f0" } },
    dataLabels: { enabled: false },
  },
};

const revenueDonut: { series: number[]; options: ApexOptions } = {
  series: [50, 50],
  options: {
    chart: { type: "donut", height: 300, background: "transparent" },
    labels: ["BRHUB Tech", "Flex Envios"],
    colors: ["#6366f1", "#f59e0b"],
    stroke: { show: false },
    plotOptions: { pie: { donut: { size: "70%", labels: { show: true, total: { show: true, label: "Rendimentos", color: "#94a3b8", formatter: () => "50/50" } } } } },
    legend: { labels: { colors: "#e2e8f0" }, position: "bottom" },
    dataLabels: { enabled: false },
    tooltip: { theme: "dark" },
  },
};

const postageBar: { series: ApexAxisChartSeries; options: ApexOptions } = {
  series: [{ name: "Margem Agência (%)", data: [12, 12, 12, 12, 12, 12] }],
  options: {
    chart: { type: "bar", height: 220, toolbar: { show: false }, background: "transparent" },
    colors: ["#10b981"],
    xaxis: { categories: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"], labels: { style: { colors: "#94a3b8" } } },
    yaxis: { max: 20, labels: { style: { colors: "#94a3b8" }, formatter: (v: number) => `${v}%` } },
    grid: { borderColor: "#1e293b", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    dataLabels: { enabled: true, formatter: (v: number) => `${v}%`, style: { colors: ["#fff"] } },
    tooltip: { theme: "dark" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none overflow-hidden relative">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-800">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500" style={{ width: `${((current + 1) / SLIDES.length) * 100}%` }} />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800/80 backdrop-blur-lg rounded-full px-5 py-2 border border-slate-700/50">
        <button onClick={() => setCurrent((p) => Math.max(p - 1, 0))} className="p-1 hover:text-indigo-400 transition disabled:opacity-30" disabled={current === 0}><ChevronLeft size={20} /></button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-indigo-400 w-6" : "bg-slate-600 hover:bg-slate-500"}`} />
          ))}
        </div>
        <button onClick={() => setCurrent((p) => Math.min(p + 1, SLIDES.length - 1))} className="p-1 hover:text-indigo-400 transition disabled:opacity-30" disabled={current === SLIDES.length - 1}><ChevronRight size={20} /></button>
        <span className="text-xs text-slate-400 ml-2 font-mono">{current + 1}/{SLIDES.length}</span>
      </div>

      {/* Slides */}
      <div className="h-screen flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto animate-fade-in" key={slide}>

          {/* ─── COVER ─────────────────────────────────────────── */}
          {slide === "cover" && (
            <div className="text-center space-y-8">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-5 py-2 text-indigo-300 text-sm font-medium">
                <Sparkles size={16} /> Proposta de Parceria Estratégica
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">BRHUB Tech</span>
                <br />
                <span className="text-3xl md:text-4xl text-slate-300 font-light">× Flex Envios × Look China</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Marketplace logístico integrado com tecnologia de ponta, suporte IA e operação omnichannel
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <button onClick={() => setCurrent(1)} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/25">
                  Iniciar Apresentação <ArrowRight size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-600 pt-6">Pressione → ou Espaço para avançar · F para tela cheia</p>
            </div>
          )}

          {/* ─── OPPORTUNITY ────────────────────────────────────── */}
          {slide === "opportunity" && (
            <div className="space-y-8">
              <SectionHeader icon={<TrendingUp />} title="A Oportunidade" subtitle="Por que agora?" />
              <div className="grid md:grid-cols-3 gap-6">
                <MetricCard icon={<Globe />} value="R$ 185B" label="Mercado de e-commerce Brasil 2025" accent="indigo" />
                <MetricCard icon={<Package />} value="+23%" label="Crescimento anual de envios" accent="emerald" />
                <MetricCard icon={<Building2 />} value="Look China" label="2 pontos estratégicos prontos" accent="amber" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-4">A Proposta</h3>
                <p className="text-slate-300 leading-relaxed text-lg">
                  A <strong className="text-indigo-400">BRHUB Tech/Envios</strong> convida o grupo <strong className="text-amber-400">Flex Envios</strong> a se tornar parceiro e <strong className="text-emerald-400">operador logístico oficial</strong> do marketplace Look China, com infraestrutura tecnológica completa, pontos de coleta estratégicos e modelo de receita compartilhada.
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
                  { icon: <Globe size={24} />, title: "Integrações", desc: "Shopify, API aberta, importação em massa" },
                  { icon: <Warehouse size={24} />, title: "FULL (Galpão)", desc: "Sistema completo de fulfillment e expedição" },
                ].map((f, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6 hover:border-indigo-500/40 transition group">
                    <div className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform">{f.icon}</div>
                    <h4 className="font-bold mb-1">{f.title}</h4>
                    <p className="text-sm text-slate-400">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── AI FEATURES ───────────────────────────────────── */}
          {slide === "ai-features" && (
            <div className="space-y-8">
              <SectionHeader icon={<Bot />} title="Suporte com IA" subtitle="Inteligência artificial integrada" />
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-700/30 rounded-2xl p-8 space-y-5">
                  <h3 className="text-2xl font-bold flex items-center gap-3"><Bot className="text-indigo-400" /> WhatsApp AI Agent</h3>
                  <ul className="space-y-3">
                    {[
                      "Rastreamento automático por código ou pedido",
                      "Resolução de dúvidas 24/7 sem intervenção humana",
                      "Detecção de sentimento e escalonamento inteligente",
                      "Notificações proativas: saiu para entrega, aguardando retirada",
                      "Pipeline de suporte com categorização automática",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-5">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={18} className="text-amber-400" /> Sinalização Inteligente</h4>
                    <p className="text-slate-400 text-sm">Alertas automáticos de atraso, entrega falhada e objetos retidos. IA identifica padrões e sugere ações antes que o cliente reclame.</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Phone size={18} className="text-emerald-400" /> CRM WhatsApp</h4>
                    <p className="text-slate-400 text-sm">Gestão completa de conversas, tickets, templates HSM, histórico de interações e métricas de atendimento em tempo real.</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Zap size={18} className="text-indigo-400" /> Ferramentas AI-Powered</h4>
                    <p className="text-slate-400 text-sm">Consulta de rastreio, cotação de frete, abertura de tickets e busca de dados — tudo acionado via IA direto no WhatsApp.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── INTEGRATION ───────────────────────────────────── */}
          {slide === "integration" && (
            <div className="space-y-8">
              <SectionHeader icon={<Globe />} title="Arquitetura de Integração" subtitle="Como funciona tecnicamente" />
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <IntegrationBlock label="Flex Envios" sub="Disponibiliza API" color="amber" />
                  <ArrowRight size={32} className="text-slate-600 shrink-0 rotate-90 md:rotate-0" />
                  <IntegrationBlock label="BRHUB Tech" sub="Desenvolve & Integra" color="indigo" />
                  <ArrowRight size={32} className="text-slate-600 shrink-0 rotate-90 md:rotate-0" />
                  <IntegrationBlock label="Look China" sub="Whitelabel Marketplace" color="emerald" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
                  <h4 className="font-bold mb-3 text-indigo-400">🖥️ Plataforma Marketplace</h4>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li>• Nova plataforma integrada com contrato Flex Envios</li>
                    <li>• Whitelabel personalizado Look China</li>
                    <li>• Desenvolvimento 100% BRHUB</li>
                    <li>• Dashboard próprio para o lojista</li>
                  </ul>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
                  <h4 className="font-bold mb-3 text-amber-400">📦 Sistema FULL (Galpão)</h4>
                  <ul className="space-y-2 text-slate-300 text-sm">
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
                <LocationCard
                  name="Look China"
                  address="Rua Carnot"
                  type="Ponto de Coleta Principal"
                  features={["Recebimento de encomendas", "Atendimento ao lojista", "Etiquetagem e despacho", "Suporte presencial"]}
                />
                <LocationCard
                  name="Look China Shopping"
                  address="Rua Maria Marcolina"
                  type="Ponto de Coleta Secundário"
                  features={["Coleta centralizada do shopping", "Alto volume de lojistas", "Expedição diária", "Integração com marketplace"]}
                />
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 text-center">
                <p className="text-indigo-300 text-lg">
                  🎯 Dois pontos estratégicos = <strong>maior cobertura</strong> e <strong>conveniência</strong> para os lojistas do marketplace
                </p>
              </div>
            </div>
          )}

          {/* ─── REVENUE ───────────────────────────────────────── */}
          {slide === "revenue" && (
            <div className="space-y-8">
              <SectionHeader icon={<Handshake />} title="Modelo de Receita" subtitle="Divisão dos rendimentos" />
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <ReactApexChart options={revenueDonut.options} series={revenueDonut.series} type="donut" height={300} />
                </div>
                <div className="space-y-5">
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-indigo-400 mb-2">BRHUB Tech — 50%</h4>
                    <p className="text-slate-300 text-sm">Responsável por toda infraestrutura tecnológica, desenvolvimento, manutenção da plataforma, suporte com IA e integração.</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-amber-400 mb-2">Flex Envios — 50%</h4>
                    <p className="text-slate-300 text-sm">Operação logística, API de contratos, infraestrutura de transporte e rede de distribuição.</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-emerald-400 mb-2">+ 12% Margem de Agência</h4>
                    <p className="text-slate-300 text-sm">Adicional sobre todo volume postado na agência — receita garantida independente da operação do marketplace.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── FAIRNESS ──────────────────────────────────────── */}
          {slide === "fairness" && (
            <div className="space-y-8">
              <SectionHeader icon={<BarChart3 />} title="Análise de Viabilidade" subtitle="O modelo é justo?" />
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold mb-4 text-lg">Margem de 12% sobre postagens</h4>
                  <ReactApexChart options={postageBar.options} series={postageBar.series} type="bar" height={220} />
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold mb-2 text-lg">Avaliação do Modelo</h4>
                  {[
                    { label: "Flex Envios recebe", detail: "50% dos rendimentos do marketplace + 12% das postagens na agência", verdict: "✅ Receita dupla" },
                    { label: "BRHUB assume", detail: "100% do desenvolvimento, manutenção e suporte IA", verdict: "⚖️ Investimento alto" },
                    { label: "Flex opera", detail: "Logística, API e infraestrutura física (galpão + agência)", verdict: "✅ Core business" },
                    { label: "Risco BRHUB", detail: "Desenvolvimento sem garantia de volume inicial", verdict: "⚠️ Risco mitigado pela parceria" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{item.label}</p>
                          <p className="text-slate-400 text-xs mt-1">{item.detail}</p>
                        </div>
                        <span className="text-xs shrink-0 ml-3">{item.verdict}</span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mt-2">
                    <p className="text-emerald-300 text-sm font-medium">
                      ✅ O modelo é <strong>justo e equilibrado</strong>. Flex Envios tem receita garantida (12%) + upside do marketplace (50%), enquanto BRHUB investe em tecnologia com retorno proporcional ao crescimento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── PROJECTIONS ───────────────────────────────────── */}
          {slide === "projections" && (
            <div className="space-y-8">
              <SectionHeader icon={<TrendingUp />} title="Projeção 12 Meses" subtitle="Crescimento estimado da operação" />
              <ReactApexChart options={projectionChart.options} series={projectionChart.series} type="area" height={340} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniMetric label="Envios Mês 12" value="17.500" />
                <MiniMetric label="Faturamento Mês 12" value="R$ 280k" />
                <MiniMetric label="Receita Flex (50%+12%)" value="R$ 174k" />
                <MiniMetric label="Receita BRHUB (50%)" value="R$ 140k" />
              </div>
            </div>
          )}

          {/* ─── TIMELINE ──────────────────────────────────────── */}
          {slide === "timeline" && (
            <div className="space-y-8">
              <SectionHeader icon={<Zap />} title="Roadmap de Implementação" subtitle="Fases do projeto" />
              <div className="space-y-4">
                {[
                  { phase: "Fase 1", period: "Semana 1-2", title: "Setup & Integração API", items: ["Configuração API Flex Envios", "Ambiente de desenvolvimento", "Whitelabel base Look China"] },
                  { phase: "Fase 2", period: "Semana 3-4", title: "Plataforma Marketplace", items: ["Dashboard do lojista", "Emissão de etiquetas integrada", "Rastreamento automático"] },
                  { phase: "Fase 3", period: "Semana 5-6", title: "IA & Automação", items: ["Agente WhatsApp AI", "Notificações automáticas HSM", "Pipeline de suporte"] },
                  { phase: "Fase 4", period: "Semana 7-8", title: "Pontos de Coleta & FULL", items: ["Setup Rua Carnot & Maria Marcolina", "Sistema FULL no galpão", "Go-live operação completa"] },
                ].map((p, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">{i + 1}</div>
                      {i < 3 && <div className="w-0.5 h-full bg-slate-700 mt-1" />}
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 flex-1 mb-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 rounded-full px-3 py-0.5 font-mono">{p.period}</span>
                        <span className="font-bold">{p.phase}: {p.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.items.map((item, j) => (
                          <span key={j} className="text-xs bg-slate-700/50 text-slate-300 rounded-lg px-3 py-1">{item}</span>
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
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-4xl md:text-6xl font-extrabold">
                <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Vamos Construir Juntos</span>
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Tecnologia BRHUB + Operação Flex Envios = o marketplace logístico mais completo para a comunidade Look China
              </p>
              <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6">
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
                  <div className="text-3xl font-extrabold text-indigo-400">50/50</div>
                  <p className="text-slate-400 text-sm mt-2">Rendimentos compartilhados</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
                  <div className="text-3xl font-extrabold text-emerald-400">+12%</div>
                  <p className="text-slate-400 text-sm mt-2">Margem de agência garantida</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-6">
                  <div className="text-3xl font-extrabold text-amber-400">8 sem</div>
                  <p className="text-slate-400 text-sm mt-2">Time-to-market</p>
                </div>
              </div>
              <div className="pt-6">
                <p className="text-slate-500 text-sm">BRHUB Tech/Envios • {new Date().getFullYear()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">{icon}</div>
      <div>
        <h2 className="text-3xl font-extrabold">{title}</h2>
        <p className="text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent: string }) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-500/10 to-indigo-900/10 border-indigo-500/20 text-indigo-400",
    emerald: "from-emerald-500/10 to-emerald-900/10 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-900/10 border-amber-500/20 text-amber-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} border rounded-2xl p-6 text-center`}>
      <div className={`mx-auto mb-3 ${colors[accent].split(" ").pop()}`}>{icon}</div>
      <div className="text-3xl font-extrabold">{value}</div>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}

function IntegrationBlock({ label, sub, color }: { label: string; sub: string; color: string }) {
  const border: Record<string, string> = { amber: "border-amber-500/40 text-amber-400", indigo: "border-indigo-500/40 text-indigo-400", emerald: "border-emerald-500/40 text-emerald-400" };
  return (
    <div className={`border-2 ${border[color]} rounded-2xl p-6 text-center min-w-[160px]`}>
      <p className="font-bold text-lg">{label}</p>
      <p className="text-slate-400 text-sm">{sub}</p>
    </div>
  );
}

function LocationCard({ name, address, type, features }: { name: string; address: string; type: string; features: string[] }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 hover:border-emerald-500/30 transition">
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="text-emerald-400 shrink-0 mt-1" />
        <div>
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-slate-400 text-sm">{address}</p>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 rounded-full px-3 py-0.5 mt-2 inline-block">{type}</span>
        </div>
      </div>
      <ul className="space-y-2 mt-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
      <div className="text-xl font-extrabold text-white">{value}</div>
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  );
}
