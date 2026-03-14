import { useRef, useState } from "react";
import {
  Truck, Globe, Warehouse, MapPin,
  BarChart3, Zap, Shield, Package,
  Phone, Brain, Mic, Eye, MessageCircle,
  AlertTriangle, Clock, Send, Star, ShieldCheck,
  Download, Loader2
} from "lucide-react";
import lookChinaProfile from "@/assets/look-china-profile.png";

// ─── Colors (same as pitch) ──────────────────────────────────────────────────
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

// ─── Scenarios data ──────────────────────────────────────────────────────────
const FISICO_FAT = 8;
const TICKET_MEDIO = 25;
const FISICO_ENVIOS = (FISICO_FAT * 1_000_000) / TICKET_MEDIO;

const baseConversion = [1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6, 7, 7.5, 8];
const enviosMes = baseConversion.map((pct) => Math.round((pct / 100) * FISICO_ENVIOS));
const fatMesR$ = enviosMes.map((v) => v * TICKET_MEDIO);
const enviosDia = enviosMes.map((v) => Math.round(v / 26));
let acumEnv = 0;
const acumuladosEnv = enviosMes.map((v) => { acumEnv += v; return acumEnv; });
let acumFat = 0;
const acumuladosFat = fatMesR$.map((v) => { acumFat += v; return acumFat; });

const fmtR$ = (v: number) => v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M` : `R$ ${(v / 1000).toFixed(0)}k`;

// ─── Sub-components (PDF versions) ──────────────────────────────────────────
function SlideHeader({ title, accent, tag }: { title: string; accent: string; tag: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: C.navy, margin: 0, letterSpacing: "-0.02em" }}>
        {title} <span style={{ color: C.orange }}>{accent}</span>
      </h2>
      <span style={{ fontSize: 10, fontWeight: 600, borderBottom: `2px solid ${C.orange}`, paddingBottom: 2, color: C.navy }}>{tag}</span>
    </div>
  );
}

function CircleMetric({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${color || C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: color || C.navy }}>{value}</span>
      </div>
      <p style={{ fontSize: 10, fontWeight: 500, color: C.textMuted, margin: 0 }}>{label}</p>
    </div>
  );
}

// ─── Main PDF Component ─────────────────────────────────────────────────────
export default function PitchPdfExport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!contentRef.current || generating) return;
    setGenerating(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `BRHUB_Proposta_LookChina_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: C.bg },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
        pagebreak: { mode: ["css", "legacy"] as any },
      };
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const pageStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 500,
    padding: "40px 50px",
    background: C.bg,
    pageBreakAfter: "always" as any,
    boxSizing: "border-box",
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Download button */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100 }}>
        <button
          onClick={handleDownload}
          disabled={generating}
          style={{
            background: C.orange,
            color: "white",
            border: "none",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: generating ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
          }}
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {generating ? "Gerando PDF..." : "Baixar PDF"}
        </button>
      </div>

      {/* Content to export */}
      <div ref={contentRef}>

        {/* ═══ SLIDE 1: COVER ═══ */}
        <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 60, width: "100%" }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 0.95, color: C.navy, margin: 0, letterSpacing: "-0.03em" }}>
                Proposta de<br />
                <span style={{ color: C.orange }}>Negócio</span>
              </h1>
              <div style={{ width: 60, height: 4, background: C.orange, margin: "20px 0" }} />
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, maxWidth: 420 }}>
                Marketplace logístico integrado com tecnologia de ponta, suporte IA e operação omnichannel — <strong style={{ color: C.navy }}>BRHUB Tech × Flex Envios × Look China</strong>
              </p>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", width: 260, height: 260, overflow: "hidden" }}>
                {Array.from({ length: 36 }).map((_, i) => {
                  const row = Math.floor(i / 6);
                  const col = i % 6;
                  const isOrange = (row + col) % 2 === 0;
                  return <div key={i} style={{ background: isOrange ? C.orange : C.cardBg }} />;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SLIDE 2: OPPORTUNITY ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="A" accent="Oportunidade" tag="Análise de mercado" />
          <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
            <div style={{ width: 220, border: `1px solid ${C.orangeBorder}`, overflow: "hidden" }}>
              <img src={lookChinaProfile} alt="Look China" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.navy, margin: "0 0 12px" }}>
                Grupo <span style={{ color: C.orange }}>Look China</span>
              </h3>
              <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
                Liderado por <strong style={{ color: C.navy }}>Fred</strong> (@fred_dayyy), o Look China é um <strong style={{ color: C.orange }}>grande importador com presença física na região do Brás</strong>, na Rua Maria Marcolina 369 (SP) e <strong style={{ color: C.orange }}>1,4 milhão de seguidores</strong> no Instagram.
              </p>
              <div style={{ display: "flex", gap: 24 }}>
                {[
                  { value: "1,4M", label: "Seguidores" },
                  { value: "R$ 8M", label: "Fat./mês" },
                  { value: "482+", label: "Conteúdos" },
                ].map((m, i) => (
                  <CircleMetric key={i} value={m.value} label={m.label} color={i === 1 ? C.orange : undefined} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24, padding: "16px 20px", borderLeft: `4px solid ${C.orange}`, background: C.cardBg }}>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
              A <strong style={{ color: C.orange }}>BRHUB Tech/Envios</strong> convida o grupo <strong style={{ color: C.navy }}>Flex Envios</strong> a se tornar parceiro e <strong style={{ color: C.orange }}>operador logístico oficial</strong> do marketplace Look China.
            </p>
          </div>
        </div>

        {/* ═══ SLIDE 3: PROJECTIONS ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Projeção de" accent="envios e faturamento" tag="Cenário Moderado" />
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 16 }}>
            Cenário <strong style={{ color: C.orange }}>Moderado</strong> — Adoção progressiva com incentivos (1% → 8% do volume físico em 12 meses)
          </p>
          <div style={{ border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, background: C.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.navy, margin: 0 }}>
                Moderado (1% → 8% do volume físico)
              </h4>
              <span style={{ fontSize: 9, padding: "2px 8px", fontWeight: 600, border: `1px solid ${C.orangeBorder}`, color: C.orange }}>Físico: 320k envios · R$ 8M/mês</span>
            </div>
            <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.cardBg }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: C.textMuted }}>Mês</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.orange }}>% Digital</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.orange }}>Envios/mês</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.emerald }}>Envios/dia</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.navy }}>Faturamento</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.textMuted }}>Envios acum.</th>
                  <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: C.textMuted }}>Fat. acum.</th>
                </tr>
              </thead>
              <tbody>
                {baseConversion.map((pct, i) => {
                  const isLast = i === 11;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: isLast ? C.orangeBg : "transparent" }}>
                      <td style={{ padding: "5px 10px", fontWeight: 600, color: C.text }}>Mês {i + 1}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: C.orange }}>{pct}%</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: C.orange }}>{enviosMes[i].toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", color: C.emerald }}>~{enviosDia[i].toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: C.navy }}>{fmtR$(fatMesR$[i])}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", color: C.textMuted }}>{acumuladosEnv[i].toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", color: C.textMuted }}>{fmtR$(acumuladosFat[i])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[
              { label: "Envios Mês 12", value: `${(enviosMes[11] / 1000).toFixed(1)}k`, color: C.orange },
              { label: "Envios/dia", value: `~${enviosDia[11]}`, color: C.emerald },
              { label: "Fat. Mês 12", value: fmtR$(fatMesR$[11]), color: C.navy },
              { label: "Envios Ano 1", value: `${(acumuladosEnv[11] / 1000).toFixed(0)}k`, color: C.orange },
              { label: "Fat. Ano 1", value: fmtR$(acumuladosFat[11]), color: C.amber },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "center", padding: 10, border: `1px solid ${C.border}`, background: C.white }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 9, fontWeight: 500, color: C.textMuted }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SLIDE 4: INTEGRATION ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Arquitetura de" accent="integração" tag="Fluxo técnico" />
          <div style={{ padding: 40, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            {[
              { label: "Flex Envios", sub: "Disponibiliza API", color: C.amber },
              { label: "BRHUB Tech", sub: "Desenvolve & Integra", color: C.orange },
              { label: "Look China", sub: "Marca própria", color: C.navy },
            ].map((node, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                {i > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 40, height: 2, background: C.orange }} /><span style={{ color: C.orange, fontSize: 16 }}>→</span></div>}
                <div style={{ textAlign: "center", minWidth: 120 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${node.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", background: C.white }}>
                    <span style={{ fontWeight: 900, fontSize: 10, color: node.color }}>{node.label.split(" ")[0]}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 12, color: C.navy, margin: 0 }}>{node.label}</p>
                  <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>{node.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { title: "Plataforma Digital", icon: <Globe size={16} />, items: ["Nova plataforma integrada com contrato Flex", "Plataforma personalizada Look China", "Desenvolvimento 100% BRHUB", "Painel próprio para o lojista"] },
              { title: "Sistema FULL (Galpão)", icon: <Warehouse size={16} />, items: ["Operação completa no galpão do parceiro", "Desenvolvimento dedicado se necessário", "Integração com estoque e expedição", "Gestão de coleta e despacho automatizada"] },
            ].map((section, i) => (
              <div key={i} style={{ padding: 20, border: `1px solid ${C.border}`, background: C.white }}>
                <h4 style={{ fontWeight: 700, fontSize: 13, color: i === 0 ? C.orange : C.navy, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  {section.icon} {section.title}
                </h4>
                {section.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                    <span style={{ color: C.orange }}>●</span> {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SLIDE 5: PLATFORM ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Plataforma" accent="BRHUB" tag="Recursos" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { icon: <Package size={18} />, title: "Emissão de Etiquetas", desc: "Cotação multi-transportadora, etiqueta em segundos" },
              { icon: <Truck size={18} />, title: "Rastreamento", desc: "Acompanhamento em tempo real com notificações" },
              { icon: <BarChart3 size={18} />, title: "Painel de Análises", desc: "Visão 360° de envios, custos e desempenho" },
              { icon: <Shield size={18} />, title: "Gestão Financeira", desc: "Faturas, créditos pré-pagos e extrato" },
              { icon: <Globe size={18} />, title: "Integrações", desc: "API aberta para qualquer plataforma" },
              { icon: <Warehouse size={18} />, title: "Galpão Completo", desc: "Sistema completo de logística" },
            ].map((f, i) => (
              <div key={i} style={{ padding: 20, border: `1px solid ${C.border}`, background: C.white }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${i % 2 === 0 ? C.orange : C.navy}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: i % 2 === 0 ? C.orange : C.navy }}>
                  {f.icon}
                </div>
                <h4 style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 4 }}>{f.title}</h4>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SLIDE 6: AI FEATURES ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Ecossistema de" accent="IA" tag="IA" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { icon: <Brain size={16} />, name: "Google Gemini", desc: "Raciocínio multimodal. Texto, imagens e contextos massivos." },
              { icon: <Eye size={16} />, name: "OpenAI GPT-5", desc: "Linguagem, sentimento e respostas empáticas." },
              { icon: <Mic size={16} />, name: "ElevenLabs", desc: "Voz indistinguível de humano em tempo real." },
            ].map((p, i) => (
              <div key={i} style={{ padding: 14, border: `1px solid ${C.border}`, background: C.white, display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.orange }}>
                  {p.icon}
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: 12, color: C.navy, margin: 0 }}>{p.name}</h4>
                  <p style={{ fontSize: 10, color: C.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
            <div style={{ padding: 20, background: C.navy, border: `2px solid ${C.navy}`, color: "white" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px" }}>
                <MessageCircle size={16} style={{ color: C.orangeLight }} /> WhatsApp <span style={{ color: C.orange }}>Agente IA</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {["Rastreamento automático por código", "Resolução 24/7 sem intervenção", "Detecção de sentimento inteligente", "Áudio humanizado via ElevenLabs", "Notificações proativas de entrega", "Fluxo de suporte automático"].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.9)" }}>
                    <span style={{ color: C.orange }}>●</span> {item}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: <Star size={14} />, title: "Sinalização Inteligente", desc: "Alertas de atraso e entrega falhada." },
                { icon: <Phone size={14} />, title: "Gestão WhatsApp", desc: "Conversas, chamados e métricas." },
                { icon: <Zap size={14} />, title: "Ferramentas de IA", desc: "Cotação, rastreio via IA." },
              ].map((item, i) => (
                <div key={i} style={{ padding: 12, border: `1px solid ${C.border}`, background: C.white }}>
                  <h4 style={{ fontWeight: 700, fontSize: 11, color: C.navy, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: C.orange }}>{item.icon}</span> {item.title}
                  </h4>
                  <p style={{ fontSize: 10, color: C.textMuted, margin: "2px 0 0" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ SLIDE 7: NOTIFICATIONS ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Notificações" accent="proativas" tag="Automação" />
          <div style={{ padding: 20, background: C.navy, border: `2px solid ${C.navy}`, color: "white", marginBottom: 16, display: "flex", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={20} style={{ color: C.orange }} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <Brain size={14} style={{ color: C.orangeLight }} /> Algoritmo <span style={{ color: C.orange }}>Preditivo</span>
              </h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.5 }}>
                Monitora cada objeto. Se detecta atraso — notifica via WhatsApp <strong style={{ color: C.orangeLight }}>antes do cliente perceber</strong>.
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { icon: <Send size={16} />, title: "Etiqueta Criada", desc: "Código de rastreio e previsão." },
              { icon: <Package size={16} />, title: "Objeto Postado", desc: "Confirmação de entrega." },
              { icon: <Truck size={16} />, title: "Saiu p/ Entrega", desc: "Notificação de rota final." },
              { icon: <Clock size={16} />, title: "Aguard. Retirada", desc: "Disponível em agência." },
              { icon: <AlertTriangle size={16} />, title: "Alerta de Atraso", desc: "Aviso proativo." },
              { icon: <Star size={16} />, title: "Avaliação", desc: "Feedback pós-entrega." },
            ].map((n, i) => (
              <div key={i} style={{ padding: 14, border: `1px solid ${C.border}`, background: C.white, display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.orange }}>
                  {n.icon}
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: 11, color: C.navy, margin: 0 }}>{n.title}</h4>
                  <p style={{ fontSize: 10, color: C.textMuted, margin: "2px 0 0" }}>{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SLIDE 8: COLLECTION POINTS ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Pontos de" accent="coleta" tag="Localização" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
            {[
              { name: "Look China", address: "Rua Carnot", type: "Principal", features: ["Recebimento de encomendas", "Atendimento ao lojista", "Etiquetagem e despacho", "Suporte presencial"] },
              { name: "Look China Shopping", address: "Rua Maria Marcolina", type: "Secundário", features: ["Coleta centralizada", "Alto volume de lojistas", "Expedição diária", "Integração com plataforma"] },
            ].map((loc, i) => (
              <div key={i} style={{ padding: 24, border: `1px solid ${C.border}`, background: C.white }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.orange }}>
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>{loc.name}</h3>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0" }}>{loc.address}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", border: `1px solid ${C.orangeBorder}`, color: C.orange }}>{loc.type}</span>
                  </div>
                </div>
                {loc.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                    <span style={{ color: C.orange }}>●</span> {f}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: 12, textAlign: "center", borderLeft: `4px solid ${C.orange}`, background: C.cardBg }}>
            <p style={{ fontSize: 12, color: C.navy, margin: 0 }}>
              Dois pontos estratégicos = <strong>maior cobertura</strong> e <strong>conveniência</strong>
            </p>
          </div>
        </div>

        {/* ═══ SLIDE 9: TIMELINE ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Algumas" accent="etapas" tag="Cronograma" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { phase: "Semana 1", title: "Configuração", items: ["Configuração API Flex Envios", "Ambiente de desenvolvimento", "Plataforma base Look China"] },
              { phase: "Semana 2", title: "Plataforma", items: ["Painel do lojista", "Emissão de etiquetas integrada", "Rastreamento automático"] },
              { phase: "Semana 3", title: "IA & Automação", items: ["Agente WhatsApp IA", "Notificações automáticas", "Fluxo de suporte"] },
              { phase: "Semana 4", title: "Lançamento", items: ["Ativação Carnot & Marcolina", "Sistema completo no galpão", "Início da operação"] },
            ].map((col, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, background: C.white, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", background: C.orange, color: "white", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {col.phase}
                </div>
                <div style={{ padding: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 10px" }}>{col.title}</h4>
                  {col.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", gap: 6, fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                      <span style={{ color: C.orange }}>●</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SLIDE 10: REVENUE ═══ */}
        <div style={pageStyle}>
          <SlideHeader title="Modelo de" accent="receita" tag="Negócio" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[
              { title: "BRHUB Tech — Entregas", color: C.navy, icon: <Zap size={14} />, items: [
                { label: "Plataforma tecnológica", desc: "Sistema de emissão, rastreio e gestão" },
                { label: "Inteligência Artificial", desc: "Suporte 24/7 automatizado + agentes" },
                { label: "Cobrança e faturamento", desc: "Gestão completa de cobranças e repasses" },
                { label: "Integrações marketplace", desc: "APIs, webhooks, automações" },
                { label: "Marca própria (Whitelabel)", desc: "Plataforma com identidade do parceiro" },
              ]},
              { title: "Flex Envios — Entregas", color: C.orange, icon: <Truck size={14} />, items: [
                { label: "Contratos com transportadoras", desc: "Preços negociados e rede logística" },
                { label: "Operação física", desc: "Coleta, triagem e distribuição" },
                { label: "Margem sobre postagens", desc: "Receita por etiqueta emitida" },
                { label: "Rede de pontos de coleta", desc: "Capilaridade e conveniência" },
                { label: "Suporte operacional", desc: "Atendimento e resolução logística" },
              ]},
            ].map((section, i) => (
              <div key={i} style={{ padding: 20, border: `1px solid ${C.border}`, background: C.white, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: section.color }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${section.color}`, display: "flex", alignItems: "center", justifyContent: "center", color: section.color }}>
                    {section.icon}
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: 12, color: section.color, margin: 0 }}>{section.title}</h4>
                </div>
                {section.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: section.color, flexShrink: 0, marginTop: 4 }} />
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{item.label}</span>
                      <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: 14, background: C.navy, border: `2px solid ${C.navy}`, color: "white", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <ShieldCheck size={18} style={{ color: C.orange, flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: 11, margin: 0 }}>Zero Risco de <span style={{ color: C.orange }}>Inadimplência</span></h4>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: "2px 0 0" }}>A BRHUB assume 100% da cobrança e do risco. Repasses mensais garantidos.</p>
            </div>
          </div>
        </div>

        {/* ═══ SLIDE 11: CLOSING ═══ */}
        <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", pageBreakAfter: "auto" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 52, fontWeight: 900, color: C.navy, margin: 0, letterSpacing: "-0.03em" }}>
              Vamos construir<br /><span style={{ color: C.orange }}>juntos</span>
            </h2>
            <div style={{ width: 60, height: 4, background: C.orange, margin: "24px auto" }} />
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, maxWidth: 500, margin: "0 auto 32px" }}>
              Tecnologia BRHUB + Operação Flex Envios = a plataforma logística mais completa para a comunidade Look China
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
              {[
                { value: "Win-Win", label: "Rendimentos compartilhados", color: C.navy },
                { value: "Zero risco", label: "BRHUB assume inadimplência", color: C.orange },
                { value: "4 sem", label: "Prazo de entrega", color: C.amber },
              ].map((item, i) => (
                <CircleMetric key={i} value={item.value} label={item.label} color={item.color} />
              ))}
            </div>
            <p style={{ fontSize: 10, fontWeight: 500, color: C.textMuted, marginTop: 32 }}>BRHUB Tech/Envios • {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
