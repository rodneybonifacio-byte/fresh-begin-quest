import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, Zap, DollarSign, Package, BarChart3 } from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaFirstLabel() {
  // Parâmetros configuráveis
  const [custoEtiqueta, setCustoEtiqueta] = useState(18.90);
  const [precoSuperfrete1, setPrecoSuperfrete1] = useState(14.53);
  const [markupPerc, setMarkupPerc] = useState(10.7);
  const [comissaoConecta, setComissaoConecta] = useState(20);
  const [totalEtiquetas, setTotalEtiquetas] = useState(10);

  // Cálculos - primeira etiqueta (loss leader)
  const perdaPrimeiraEtiqueta = custoEtiqueta - precoSuperfrete1;
  const nossoPrimeiroPreco = precoSuperfrete1; // igualamos

  // Cálculos - etiquetas subsequentes
  const nossoPrecoNormal = custoEtiqueta * (1 + markupPerc / 100);
  const margem = nossoPrecoNormal - custoEtiqueta;
  const comissaoValor = margem * (comissaoConecta / 100);
  const lucroLiquidoPorEtiqueta = margem - comissaoValor;

  // Ponto de equilíbrio
  const breakEvenEtiquetas = Math.ceil(perdaPrimeiraEtiqueta / lucroLiquidoPorEtiqueta);

  // Projeção acumulada
  const projecao = Array.from({ length: totalEtiquetas }, (_, i) => {
    const etiqueta = i + 1;
    let acumulado = 0;
    if (etiqueta === 1) {
      acumulado = -perdaPrimeiraEtiqueta;
    } else {
      acumulado = -perdaPrimeiraEtiqueta + (etiqueta - 1) * lucroLiquidoPorEtiqueta;
    }
    return { etiqueta, acumulado };
  });

  // Superfrete projeção (para comparação)
  const projecaoSuperfrete = Array.from({ length: totalEtiquetas }, (_, i) => {
    const etiqueta = i + 1;
    let acumulado = 0;
    if (etiqueta === 1) {
      acumulado = -perdaPrimeiraEtiqueta; // mesmo prejuízo
    } else {
      // Superfrete tem preço ~R$54,56 com custo ~R$48,76 → margem ~5,80 sem comissão
      const margemSF = 5.80;
      acumulado = -perdaPrimeiraEtiqueta + (etiqueta - 1) * margemSF;
    }
    return { etiqueta, acumulado };
  });

  const maxAcumulado = Math.max(...projecao.map(p => p.acumulado), ...projecaoSuperfrete.map(p => p.acumulado));
  const minAcumulado = Math.min(...projecao.map(p => p.acumulado));
  const range = maxAcumulado - minAcumulado;

  const yToPercent = (v: number) => ((v - minAcumulado) / range) * 100;

  const isBreakEvenVisible = breakEvenEtiquetas <= totalEtiquetas;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-500/20 rounded-xl">
          <Target className="w-7 h-7 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Estratégia Loss Leader — Primeira Etiqueta</h1>
          <p className="text-slate-400 text-sm">Análise competitiva: perder na 1ª para ganhar na recorrência</p>
        </div>
      </div>

      {/* Parâmetros */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" /> Parâmetros da Simulação
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Custo BRHUB (R$)", value: custoEtiqueta, set: setCustoEtiqueta, step: 0.01 },
            { label: "1ª etiqueta Superfrete (R$)", value: precoSuperfrete1, set: setPrecoSuperfrete1, step: 0.01 },
            { label: "Markup subsequente (%)", value: markupPerc, set: setMarkupPerc, step: 0.1 },
            { label: "Comissão Conecta+ (%)", value: comissaoConecta, set: setComissaoConecta, step: 1 },
            { label: "Total de etiquetas", value: totalEtiquetas, set: setTotalEtiquetas, step: 1 },
          ].map(({ label, value, set, step }) => (
            <div key={label}>
              <label className="text-xs text-slate-400 block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                step={step}
                onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Perda 1ª etiqueta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-300 font-medium">Perda — 1ª Etiqueta</span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400">
            -{formatBRL(perdaPrimeiraEtiqueta)}
          </div>
          <div className="text-xs text-red-300/70 space-y-1">
            <div className="flex justify-between">
              <span>Nosso custo</span><span>{formatBRL(custoEtiqueta)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cobramos do cliente</span><span>{formatBRL(nossoPrimeiroPreco)}</span>
            </div>
          </div>
        </motion.div>

        {/* Ganho por etiqueta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-green-950/40 border border-green-500/30 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-300 font-medium">Lucro — Etiquetas Seguintes</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-black text-green-400">
            +{formatBRL(lucroLiquidoPorEtiqueta)}
          </div>
          <div className="text-xs text-green-300/70 space-y-1">
            <div className="flex justify-between">
              <span>Preço venda ({markupPerc}%)</span><span>{formatBRL(nossoPrecoNormal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Margem bruta</span><span>{formatBRL(margem)}</span>
            </div>
            <div className="flex justify-between">
              <span>Comissão Conecta+</span><span>-{formatBRL(comissaoValor)}</span>
            </div>
          </div>
        </motion.div>

        {/* Break-even */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-orange-950/40 border border-orange-500/30 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-300 font-medium">Ponto de Equilíbrio</span>
            <Target className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-black text-orange-400">
            {breakEvenEtiquetas + 1}ª etiqueta
          </div>
          <div className="text-xs text-orange-300/70">
            <p>Após <strong className="text-orange-300">{breakEvenEtiquetas}</strong> etiquetas com lucro, a perda inicial está coberta.</p>
            <p className="mt-1">A partir da <strong className="text-orange-300">{breakEvenEtiquetas + 1}ª</strong> você está no positivo.</p>
          </div>
        </motion.div>

        {/* Lucro final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-300 font-medium">Lucro em {totalEtiquetas} Etiquetas</span>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <div className={`text-3xl font-black ${projecao[totalEtiquetas - 1]?.acumulado >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {formatBRL(projecao[totalEtiquetas - 1]?.acumulado || 0)}
          </div>
          <div className="text-xs text-blue-300/70">
            <p>1 etiqueta subsidiada + {totalEtiquetas - 1} com lucro normal</p>
            <p className="mt-1">Lucro médio/etiqueta: <strong className="text-blue-300">{formatBRL((projecao[totalEtiquetas - 1]?.acumulado || 0) / totalEtiquetas)}</strong></p>
          </div>
        </motion.div>
      </div>

      {/* Gráfico de lucro acumulado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6"
      >
        <h2 className="font-semibold text-slate-300 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Lucro Acumulado por Etiqueta
        </h2>

        <div className="relative h-64">
          {/* Linha zero */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-slate-500 flex items-center"
            style={{ top: `${100 - yToPercent(0)}%` }}
          >
            <span className="text-xs text-slate-400 bg-slate-900 pr-2 -translate-y-1/2">R$ 0</span>
          </div>

          {/* Linha de break-even */}
          {isBreakEvenVisible && (
            <div
              className="absolute border-l-2 border-dashed border-orange-500/60"
              style={{
                left: `${((breakEvenEtiquetas) / totalEtiquetas) * 100}%`,
                top: 0,
                height: '100%'
              }}
            >
              <span className="absolute top-0 left-2 text-xs text-orange-400 whitespace-nowrap">
                Break-even
              </span>
            </div>
          )}

          {/* SVG Chart */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${totalEtiquetas * 40} 260`} preserveAspectRatio="none">
            {/* Linha BRHUB */}
            <polyline
              points={projecao.map((p, i) => {
                const x = (i + 0.5) * (totalEtiquetas * 40 / totalEtiquetas);
                const y = 260 - (yToPercent(p.acumulado) / 100) * 240 - 10;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Pontos BRHUB */}
            {projecao.map((p, i) => {
              const x = (i + 0.5) * (totalEtiquetas * 40 / totalEtiquetas);
              const y = 260 - (yToPercent(p.acumulado) / 100) * 240 - 10;
              return (
                <circle
                  key={i}
                  cx={x} cy={y} r="5"
                  fill={p.acumulado >= 0 ? '#22c55e' : '#ef4444'}
                  stroke="#1e293b"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Labels X */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {projecao.map((p, i) => (
              <div key={i} className="flex-1 text-center text-xs text-slate-500">
                {p.etiqueta}ª
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-400 rounded" />
            <span className="text-xs text-slate-400">BRHUB (loss leader)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-dashed border-orange-400" />
            <span className="text-xs text-slate-400">Break-even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400">Positivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">Negativo (subsidiado)</span>
          </div>
        </div>
      </motion.div>

      {/* Tabela detalhada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6"
      >
        <h2 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-400" />
          Detalhamento por Etiqueta
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase border-b border-slate-700">
                <th className="text-left py-3 pr-4">Etiqueta</th>
                <th className="text-right py-3 pr-4">Preço Cobrado</th>
                <th className="text-right py-3 pr-4">Custo</th>
                <th className="text-right py-3 pr-4">Resultado</th>
                <th className="text-right py-3 pr-4">Comissão</th>
                <th className="text-right py-3 pr-4">Lucro Liq.</th>
                <th className="text-right py-3">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {projecao.map((p, i) => {
                const isPrimeira = i === 0;
                const resultado = isPrimeira ? -perdaPrimeiraEtiqueta : margem;
                const comissao = isPrimeira ? 0 : comissaoValor;
                const lucroLiq = isPrimeira ? -perdaPrimeiraEtiqueta : lucroLiquidoPorEtiqueta;
                const precoC = isPrimeira ? nossoPrimeiroPreco : nossoPrecoNormal;
                const isBreakEven = i === breakEvenEtiquetas;

                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-800 transition-colors ${isBreakEven ? 'bg-orange-500/10' : ''} hover:bg-slate-800/50`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${isPrimeira ? 'bg-red-500/20 text-red-400' : isBreakEven ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                          {p.etiqueta}ª
                        </span>
                        {isPrimeira && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Subsidiada</span>}
                        {isBreakEven && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Break-even</span>}
                      </div>
                    </td>
                    <td className="text-right py-3 pr-4 text-slate-300">{formatBRL(precoC)}</td>
                    <td className="text-right py-3 pr-4 text-slate-400">{formatBRL(custoEtiqueta)}</td>
                    <td className={`text-right py-3 pr-4 font-medium ${resultado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {resultado >= 0 ? '+' : ''}{formatBRL(resultado)}
                    </td>
                    <td className="text-right py-3 pr-4 text-yellow-400/80">
                      {comissao > 0 ? `-${formatBRL(comissao)}` : '-'}
                    </td>
                    <td className={`text-right py-3 pr-4 font-semibold ${lucroLiq >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {lucroLiq >= 0 ? '+' : ''}{formatBRL(lucroLiq)}
                    </td>
                    <td className={`text-right py-3 font-bold ${p.acumulado >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {p.acumulado >= 0 ? '+' : ''}{formatBRL(p.acumulado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600">
                <td className="py-3 text-slate-300 font-semibold">TOTAL</td>
                <td className="text-right py-3 text-slate-300 font-semibold" colSpan={5}>
                  {totalEtiquetas} etiquetas
                </td>
                <td className={`text-right py-3 font-black text-lg ${(projecao[totalEtiquetas - 1]?.acumulado || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatBRL(projecao[totalEtiquetas - 1]?.acumulado || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Conclusão */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-r from-orange-950/40 via-slate-900 to-blue-950/40 border border-orange-500/20 rounded-2xl p-6"
      >
        <h2 className="font-bold text-white mb-3">📊 Conclusão da Estratégia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-orange-400 font-semibold">🎯 Objetivo</p>
            <p className="text-slate-400">Competir com Superfrete na aquisição, perdendo {formatBRL(perdaPrimeiraEtiqueta)} na 1ª etiqueta para fidelizar o cliente.</p>
          </div>
          <div className="space-y-1">
            <p className="text-green-400 font-semibold">⚖️ Break-even</p>
            <p className="text-slate-400">A perda da 1ª etiqueta é recuperada na <strong className="text-white">{breakEvenEtiquetas + 1}ª etiqueta</strong>. Clientes que enviam regularmente compensam rapidamente.</p>
          </div>
          <div className="space-y-1">
            <p className="text-blue-400 font-semibold">💡 Recomendação</p>
            <p className="text-slate-400">Aplicar apenas para novos clientes na 1ª etiqueta. A partir da 2ª, preço normal com {markupPerc}% de markup.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
