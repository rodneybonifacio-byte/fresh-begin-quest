import { useState } from "react";
import {
  TrendingDown, TrendingUp, Target, Zap, DollarSign, BarChart3,
  CheckCircle2, AlertTriangle, Lightbulb, ArrowRight, Package, Users
} from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPct = (v: number) =>
  `${v.toFixed(1)}%`;

// ── Sub-components ─────────────────────────────────────────────

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
      <Icon className="w-4 h-4 text-primary" />
      {children}
    </h2>
  );
}

function StatCard({
  label, value, sub, color = "default", icon: Icon,
}: {
  label: string; value: string; sub?: string; color?: "red" | "green" | "primary" | "default"; icon: React.ElementType;
}) {
  const colorMap = {
    red: { bg: "bg-destructive/10", text: "text-destructive", icon: "bg-destructive/15 text-destructive" },
    green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", icon: "bg-green-500/15 text-green-600 dark:text-green-400" },
    primary: { bg: "bg-primary/10", text: "text-primary", icon: "bg-primary/15 text-primary" },
    default: { bg: "bg-muted", text: "text-foreground", icon: "bg-muted-foreground/15 text-muted-foreground" },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border border-border p-5 ${c.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-lg ${c.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-2xl font-black mb-1 ${c.text}`}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function EstrategiaFirstLabel() {
  // Parâmetros editáveis
  const [custoEtiqueta, setCustoEtiqueta] = useState(18.90);
  const [precoSuperfrete1, setPrecoSuperfrete1] = useState(14.53);
  const [markupPerc, setMarkupPerc] = useState(10.7);
  const [comissaoConecta, setComissaoConecta] = useState(20);
  const [totalEtiquetas, setTotalEtiquetas] = useState(12);

  // ── Cálculos core ──
  const perdaAbsoluta = custoEtiqueta - precoSuperfrete1;
  const percPerdaSuperfrete = (perdaAbsoluta / custoEtiqueta) * 100;

  const nossoPrecoNormal = custoEtiqueta * (1 + markupPerc / 100);
  const margem = nossoPrecoNormal - custoEtiqueta;
  const comissaoValor = margem * (comissaoConecta / 100);
  const lucroLiqPorEtiqueta = margem - comissaoValor;

  const breakEven = Math.ceil(perdaAbsoluta / lucroLiqPorEtiqueta);
  const breakEvenTotal = breakEven + 1; // incluindo a 1ª subsidiada

  const projecao = Array.from({ length: totalEtiquetas }, (_, i) => {
    const num = i + 1;
    const acumulado =
      num === 1
        ? -perdaAbsoluta
        : -perdaAbsoluta + (num - 1) * lucroLiqPorEtiqueta;
    return { num, acumulado };
  });

  const lucroTotal = projecao[totalEtiquetas - 1]?.acumulado ?? 0;
  const maxAcum = Math.max(...projecao.map(p => p.acumulado));
  const minAcum = Math.min(...projecao.map(p => p.acumulado));
  const range = maxAcum - minAcum || 1;
  const yPct = (v: number) => ((v - minAcum) / range) * 100;
  const isBreakEvenVisible = breakEvenTotal <= totalEtiquetas;

  const params = [
    { label: "Custo BRHUB (R$)", value: custoEtiqueta, set: setCustoEtiqueta, step: 0.01 },
    { label: "1ª etiqueta Superfrete (R$)", value: precoSuperfrete1, set: setPrecoSuperfrete1, step: 0.01 },
    { label: "Markup subsequente (%)", value: markupPerc, set: setMarkupPerc, step: 0.1 },
    { label: "Comissão Conecta+ (%)", value: comissaoConecta, set: setComissaoConecta, step: 1 },
    { label: "Etiquetas para projetar", value: totalEtiquetas, set: setTotalEtiquetas, step: 1 },
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Estratégia Loss Leader</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise da estratégia do Superfrete e plano de replicação para aquisição de clientes
          </p>
        </div>
        <span className="self-start inline-flex items-center gap-1.5 border border-primary/30 text-primary bg-primary/10 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
          <Target className="w-3 h-3" />
          Inteligência Competitiva
        </span>
      </div>

      {/* ── BLOCO 1: O que o Superfrete faz ── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionTitle icon={AlertTriangle}>O que o Superfrete faz na 1ª etiqueta</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Preço cobrado deles"
            value={formatBRL(precoSuperfrete1)}
            sub="Preço agressivo de entrada"
            color="default"
            icon={Package}
          />
          <StatCard
            label="Nosso custo real"
            value={formatBRL(custoEtiqueta)}
            sub="Custo BRHUB na mesma rota"
            color="default"
            icon={DollarSign}
          />
          <StatCard
            label="Prejuízo deles por etiqueta"
            value={`-${formatBRL(perdaAbsoluta)}`}
            sub={`${formatPct(percPerdaSuperfrete)} abaixo do custo`}
            color="red"
            icon={TrendingDown}
          />
        </div>

        {/* Barra de prejuízo visual */}
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Preço cobrado ({formatBRL(precoSuperfrete1)})</span>
            <span>Custo real ({formatBRL(custoEtiqueta)})</span>
          </div>
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-green-500/70"
              style={{ width: `${(precoSuperfrete1 / custoEtiqueta) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-600 dark:text-green-400 font-semibold">
              {formatPct((precoSuperfrete1 / custoEtiqueta) * 100)} do custo cobrado
            </span>
            <span className="text-destructive font-semibold">
              -{formatPct(percPerdaSuperfrete)} subsidiado
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">
            O Superfrete <strong>aceita perder {formatPct(percPerdaSuperfrete)} ({formatBRL(perdaAbsoluta)}) na primeira etiqueta</strong> deliberadamente.
            Eles sabem que clientes retornam e o lucro nas etiquetas seguintes cobre o prejuízo inicial — é uma estratégia clássica de <em>aquisição por custo</em>.
          </p>
        </div>
      </div>

      {/* ── BLOCO 2: Nossa estratégia equivalente ── */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
        <SectionTitle icon={Lightbulb}>Nossa estratégia equivalente — o que ganhamos depois</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Perda 1ª etiqueta"
            value={`-${formatBRL(perdaAbsoluta)}`}
            sub={`Mesma % do Superfrete (${formatPct(percPerdaSuperfrete)})`}
            color="red"
            icon={TrendingDown}
          />
          <StatCard
            label="Lucro líq. / etiqueta seguinte"
            value={`+${formatBRL(lucroLiqPorEtiqueta)}`}
            sub={`Markup ${formatPct(markupPerc)} − comissão ${formatPct(comissaoConecta)}`}
            color="green"
            icon={TrendingUp}
          />
          <StatCard
            label="Break-even"
            value={`${breakEvenTotal}ª etiqueta`}
            sub={`Prejuízo recuperado em ${breakEven} envios com lucro`}
            color="primary"
            icon={Target}
          />
          <StatCard
            label={`Lucro em ${totalEtiquetas} etiquetas`}
            value={`${lucroTotal >= 0 ? "+" : ""}${formatBRL(lucroTotal)}`}
            sub={`Média ${formatBRL(lucroTotal / totalEtiquetas)}/etiqueta`}
            color={lucroTotal >= 0 ? "green" : "red"}
            icon={DollarSign}
          />
        </div>

        {/* Parâmetros editáveis */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" /> Ajuste os parâmetros da simulação
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {params.map(({ label, value, set, step }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-muted-foreground block">{label}</label>
                <input
                  type="number"
                  value={value}
                  step={step}
                  onChange={e => set(parseFloat(e.target.value) || 0)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BLOCO 3: Gráfico de recuperação ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionTitle icon={BarChart3}>Curva de recuperação do investimento</SectionTitle>

        <div className="relative h-56 mb-2">
          {/* Linha zero */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-border z-10"
            style={{ top: `${100 - yPct(0)}%` }}
          >
            <span className="absolute -top-4 left-0 text-xs text-muted-foreground bg-card pr-1">R$ 0</span>
          </div>

          {/* Break-even marker */}
          {isBreakEvenVisible && (
            <div
              className="absolute border-l-2 border-dashed border-primary z-10"
              style={{
                left: `${((breakEvenTotal - 1) / totalEtiquetas) * 100}%`,
                top: 0, height: "100%",
              }}
            >
              <span className="absolute -top-5 left-1 text-xs text-primary font-semibold whitespace-nowrap">
                Break-even ({breakEvenTotal}ª)
              </span>
            </div>
          )}

          {/* SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${totalEtiquetas * 50} 220`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${projecao.map((p, i) => {
                const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
                const y = 220 - (yPct(p.acumulado) / 100) * 200 - 10;
                return `${x},${y}`;
              }).join(" L ")} L ${(totalEtiquetas - 0.5) * (totalEtiquetas * 50 / totalEtiquetas)},220 L ${0.5 * (totalEtiquetas * 50 / totalEtiquetas)},220 Z`}
              fill="url(#areaGrad)"
            />
            <polyline
              points={projecao.map((p, i) => {
                const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
                const y = 220 - (yPct(p.acumulado) / 100) * 200 - 10;
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {projecao.map((p, i) => {
              const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
              const y = 220 - (yPct(p.acumulado) / 100) * 200 - 10;
              return (
                <circle
                  key={i}
                  cx={x} cy={y} r="5"
                  fill={p.acumulado >= 0 ? "hsl(142 71% 45%)" : "hsl(var(--destructive))"}
                  stroke="hsl(var(--card))"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Labels X */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {projecao.map((p, i) => (
              <div key={i} className="flex-1 text-center text-xs text-muted-foreground">{p.num}ª</div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span className="text-xs text-muted-foreground">Lucro acumulado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0 border-t-2 border-dashed border-primary" />
            <span className="text-xs text-muted-foreground">Break-even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">No lucro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">Subsidiado</span>
          </div>
        </div>
      </div>

      {/* ── BLOCO 4: Tabela detalhada ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Detalhamento por etiqueta</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Etiqueta", "Preço Cobrado", "Custo", "Margem Bruta", "Comissão", "Lucro Líq.", "Acumulado"].map(h => (
                  <th key={h} className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projecao.map((p, i) => {
                const isPrimeira = i === 0;
                const isBreakEvenRow = p.num === breakEvenTotal;
                const preco = isPrimeira ? precoSuperfrete1 : nossoPrecoNormal;
                const margemRow = isPrimeira ? -perdaAbsoluta : margem;
                const comissaoRow = isPrimeira ? 0 : comissaoValor;
                const lucroLiq = isPrimeira ? -perdaAbsoluta : lucroLiqPorEtiqueta;

                return (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-muted/30 ${isBreakEvenRow ? "bg-primary/5" : isPrimeira ? "bg-destructive/5" : ""}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                          ${isPrimeira ? "bg-destructive/15 text-destructive" : isBreakEvenRow ? "bg-primary/15 text-primary" : "bg-green-500/15 text-green-600 dark:text-green-400"}`}>
                          {p.num}
                        </span>
                        {isPrimeira && (
                          <span className="text-xs border border-destructive/30 text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Subsidiada</span>
                        )}
                        {isBreakEvenRow && (
                          <span className="text-xs border border-primary/30 text-primary bg-primary/10 px-2 py-0.5 rounded-full">Break-even</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-foreground font-medium">{formatBRL(preco)}</td>
                    <td className="text-right py-3 px-4 text-muted-foreground">{formatBRL(custoEtiqueta)}</td>
                    <td className={`text-right py-3 px-4 font-semibold ${margemRow >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {margemRow >= 0 ? "+" : ""}{formatBRL(margemRow)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {comissaoRow > 0
                        ? <span className="text-amber-600 dark:text-amber-400">-{formatBRL(comissaoRow)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={`text-right py-3 px-4 font-semibold ${lucroLiq >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {lucroLiq >= 0 ? "+" : ""}{formatBRL(lucroLiq)}
                    </td>
                    <td className={`text-right py-3 px-4 font-bold ${p.acumulado >= 0 ? "text-primary" : "text-destructive"}`}>
                      {p.acumulado >= 0 ? "+" : ""}{formatBRL(p.acumulado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50">
                <td className="py-3 px-4 font-semibold text-foreground" colSpan={6}>
                  Total — {totalEtiquetas} etiquetas
                </td>
                <td className={`text-right py-3 px-4 font-black text-base ${lucroTotal >= 0 ? "text-primary" : "text-destructive"}`}>
                  {lucroTotal >= 0 ? "+" : ""}{formatBRL(lucroTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── BLOCO 5: Plano de ação ── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionTitle icon={CheckCircle2}>Plano de ação — como executar essa estratégia</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              icon: Users,
              color: "text-primary bg-primary/10 border-primary/20",
              title: "Identificar clientes-alvo",
              desc: `Clientes que usam Superfrete e postam no mesmo CEP de origem. Oferecer a 1ª etiqueta por ${formatBRL(precoSuperfrete1)} (igualando o preço deles) como convite.`,
            },
            {
              step: "02",
              icon: TrendingDown,
              color: "text-destructive bg-destructive/10 border-destructive/20",
              title: `Absorver ${formatPct(percPerdaSuperfrete)} de perda`,
              desc: `Aceitar o prejuízo de ${formatBRL(perdaAbsoluta)} conscientemente. É o custo de aquisição do cliente — equivalente a qualquer outro investimento em marketing.`,
            },
            {
              step: "03",
              icon: TrendingUp,
              color: "text-green-600 bg-green-500/10 border-green-500/20 dark:text-green-400",
              title: `Recuperar na ${breakEvenTotal}ª etiqueta`,
              desc: `Com markup de ${formatPct(markupPerc)} nas seguintes, o break-even ocorre na ${breakEvenTotal}ª etiqueta. A partir daí cada envio gera ${formatBRL(lucroLiqPorEtiqueta)} líquido.`,
            },
          ].map(({ step, icon: Icon, color, title, desc }) => (
            <div key={step} className={`rounded-xl border p-5 ${color}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${color}`}>
                  {step}
                </div>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm text-foreground mb-2">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Resumo executivo */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
          <div className="flex-1 flex items-center gap-3 rounded-lg bg-muted/50 border border-border px-4 py-3">
            <DollarSign className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Custo de aquisição (CAC)</p>
              <p className="font-bold text-foreground">{formatBRL(perdaAbsoluta)} / cliente novo</p>
            </div>
          </div>
          <ArrowRight className="self-center text-muted-foreground hidden sm:block" />
          <div className="flex-1 flex items-center gap-3 rounded-lg bg-muted/50 border border-border px-4 py-3">
            <Target className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Retorno do investimento</p>
              <p className="font-bold text-foreground">Recuperado na {breakEvenTotal}ª etiqueta</p>
            </div>
          </div>
          <ArrowRight className="self-center text-muted-foreground hidden sm:block" />
          <div className="flex-1 flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">LTV em {totalEtiquetas} etiquetas</p>
              <p className="font-bold text-green-600 dark:text-green-400">{formatBRL(lucroTotal)} líquido</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
