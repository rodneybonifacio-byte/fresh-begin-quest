import { useState } from "react";
import { TrendingUp, TrendingDown, Target, Zap, DollarSign, Package, BarChart3, CheckCircle2 } from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaFirstLabel() {
  const [custoEtiqueta, setCustoEtiqueta] = useState(18.90);
  const [precoSuperfrete1, setPrecoSuperfrete1] = useState(14.53);
  const [markupPerc, setMarkupPerc] = useState(10.7);
  const [comissaoConecta, setComissaoConecta] = useState(20);
  const [totalEtiquetas, setTotalEtiquetas] = useState(10);

  const perdaPrimeiraEtiqueta = custoEtiqueta - precoSuperfrete1;
  const nossoPrimeiroPreco = precoSuperfrete1;
  const nossoPrecoNormal = custoEtiqueta * (1 + markupPerc / 100);
  const margem = nossoPrecoNormal - custoEtiqueta;
  const comissaoValor = margem * (comissaoConecta / 100);
  const lucroLiquidoPorEtiqueta = margem - comissaoValor;
  const breakEvenEtiquetas = Math.ceil(perdaPrimeiraEtiqueta / lucroLiquidoPorEtiqueta);

  const projecao = Array.from({ length: totalEtiquetas }, (_, i) => {
    const etiqueta = i + 1;
    const acumulado = etiqueta === 1
      ? -perdaPrimeiraEtiqueta
      : -perdaPrimeiraEtiqueta + (etiqueta - 1) * lucroLiquidoPorEtiqueta;
    return { etiqueta, acumulado };
  });

  const maxAcumulado = Math.max(...projecao.map(p => p.acumulado));
  const minAcumulado = Math.min(...projecao.map(p => p.acumulado));
  const range = maxAcumulado - minAcumulado || 1;
  const yToPercent = (v: number) => ((v - minAcumulado) / range) * 100;
  const isBreakEvenVisible = breakEvenEtiquetas <= totalEtiquetas;
  const lucroTotal = projecao[totalEtiquetas - 1]?.acumulado || 0;

  const params = [
    { label: "Custo BRHUB (R$)", value: custoEtiqueta, set: setCustoEtiqueta, step: 0.01 },
    { label: "1ª etiqueta Superfrete (R$)", value: precoSuperfrete1, set: setPrecoSuperfrete1, step: 0.01 },
    { label: "Markup subsequente (%)", value: markupPerc, set: setMarkupPerc, step: 0.1 },
    { label: "Comissão Conecta+ (%)", value: comissaoConecta, set: setComissaoConecta, step: 1 },
    { label: "Total de etiquetas", value: totalEtiquetas, set: setTotalEtiquetas, step: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Estratégia Loss Leader</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Simulação: perder na 1ª etiqueta para conquistar o cliente do Superfrete
          </p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 border border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <Target className="w-3 h-3" />
          Simulação Estratégica
        </span>
      </div>

      {/* Parâmetros */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          Parâmetros da Simulação
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {params.map(({ label, value, set, step }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block">{label}</label>
              <input
                type="number"
                value={value}
                step={step}
                onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Perda 1ª etiqueta */}
        <div className="bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perda — 1ª Etiqueta</span>
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-500 mb-3">
            -{formatBRL(perdaPrimeiraEtiqueta)}
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Nosso custo</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatBRL(custoEtiqueta)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cobramos do cliente</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatBRL(nossoPrimeiroPreco)}</span>
            </div>
          </div>
        </div>

        {/* Lucro subsequente */}
        <div className="bg-white dark:bg-slate-800 border border-green-100 dark:border-green-900/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lucro — Seguintes</span>
            <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/30">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-green-600 mb-3">
            +{formatBRL(lucroLiquidoPorEtiqueta)}
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Preço venda ({markupPerc}%)</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatBRL(nossoPrecoNormal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Margem bruta</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatBRL(margem)}</span>
            </div>
            <div className="flex justify-between">
              <span>Comissão Conecta+</span>
              <span className="font-medium text-red-500">-{formatBRL(comissaoValor)}</span>
            </div>
          </div>
        </div>

        {/* Break-even */}
        <div className="bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ponto de Equilíbrio</span>
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30">
              <Target className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-500 mb-3">
            {breakEvenEtiquetas + 1}ª etiqueta
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 pt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Após <strong className="text-gray-700 dark:text-gray-300">{breakEvenEtiquetas}</strong> etiquetas com lucro</p>
            <p>a perda inicial está coberta</p>
          </div>
        </div>

        {/* Lucro total */}
        <div className={`bg-white dark:bg-slate-800 border rounded-xl p-5 shadow-sm ${lucroTotal >= 0 ? 'border-blue-100 dark:border-blue-900/40' : 'border-red-100 dark:border-red-900/40'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lucro em {totalEtiquetas} Etiquetas</span>
            <div className={`p-1.5 rounded-lg ${lucroTotal >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              <DollarSign className={`w-4 h-4 ${lucroTotal >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
            </div>
          </div>
          <div className={`text-2xl font-black mb-3 ${lucroTotal >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {lucroTotal >= 0 ? '+' : ''}{formatBRL(lucroTotal)}
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 pt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>1 subsidiada + {totalEtiquetas - 1} com lucro</p>
            <p>Média: <strong className="text-gray-700 dark:text-gray-300">{formatBRL(lucroTotal / totalEtiquetas)}/etiqueta</strong></p>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Curva de Lucro Acumulado
        </h2>

        <div className="relative h-56 mb-4">
          {/* Linha zero */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-gray-300 dark:border-slate-500 z-10"
            style={{ top: `${100 - yToPercent(0)}%` }}
          >
            <span className="absolute -top-4 left-0 text-xs text-gray-400 bg-white dark:bg-slate-800 pr-2">R$ 0</span>
          </div>

          {/* Linha break-even */}
          {isBreakEvenVisible && (
            <div
              className="absolute border-l-2 border-dashed border-orange-400 z-10"
              style={{
                left: `${((breakEvenEtiquetas) / totalEtiquetas) * 100}%`,
                top: 0,
                height: '100%'
              }}
            >
              <span className="absolute -top-5 left-1 text-xs text-orange-500 font-medium whitespace-nowrap">
                Break-even
              </span>
            </div>
          )}

          {/* SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${totalEtiquetas * 50} 220`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Área preenchida */}
            <path
              d={`M ${projecao.map((p, i) => {
                const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
                const y = 220 - (yToPercent(p.acumulado) / 100) * 200 - 10;
                return `${x},${y}`;
              }).join(' L ')} L ${(totalEtiquetas - 0.5) * (totalEtiquetas * 50 / totalEtiquetas)},220 L ${0.5 * (totalEtiquetas * 50 / totalEtiquetas)},220 Z`}
              fill="url(#lineGrad)"
            />

            {/* Linha */}
            <polyline
              points={projecao.map((p, i) => {
                const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
                const y = 220 - (yToPercent(p.acumulado) / 100) * 200 - 10;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Pontos */}
            {projecao.map((p, i) => {
              const x = (i + 0.5) * (totalEtiquetas * 50 / totalEtiquetas);
              const y = 220 - (yToPercent(p.acumulado) / 100) * 200 - 10;
              return (
                <circle
                  key={i}
                  cx={x} cy={y} r="5"
                  fill={p.acumulado >= 0 ? '#22c55e' : '#ef4444'}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Labels X */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {projecao.map((p, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-400">
                {p.etiqueta}ª
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-4 border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-blue-500 rounded" />
            <span className="text-xs text-gray-500">Lucro acumulado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0 border-t-2 border-dashed border-orange-400" />
            <span className="text-xs text-gray-500">Break-even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500">Positivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Subsidiado</span>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detalhamento por Etiqueta</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Etiqueta</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preço Cobrado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Custo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resultado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comissão</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Liq.</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {projecao.map((p, i) => {
                const isPrimeira = i === 0;
                const isBreakEven = i === breakEvenEtiquetas;
                const resultado = isPrimeira ? -perdaPrimeiraEtiqueta : margem;
                const comissao = isPrimeira ? 0 : comissaoValor;
                const lucroLiq = isPrimeira ? -perdaPrimeiraEtiqueta : lucroLiquidoPorEtiqueta;
                const precoC = isPrimeira ? nossoPrimeiroPreco : nossoPrecoNormal;

                return (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30 ${isBreakEven ? 'bg-orange-50 dark:bg-orange-900/10' : isPrimeira ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                          ${isPrimeira ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : isBreakEven ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                          {p.etiqueta}
                        </span>
                        {isPrimeira && (
                          <span className="text-xs border border-red-200 text-red-600 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Subsidiada</span>
                        )}
                        {isBreakEven && (
                          <span className="text-xs border border-orange-200 text-orange-600 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">Break-even</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">{formatBRL(precoC)}</td>
                    <td className="text-right py-3 px-4 text-gray-500 dark:text-gray-400">{formatBRL(custoEtiqueta)}</td>
                    <td className={`text-right py-3 px-4 font-semibold ${resultado >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {resultado >= 0 ? '+' : ''}{formatBRL(resultado)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {comissao > 0 ? <span className="text-amber-600 dark:text-amber-400">-{formatBRL(comissao)}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className={`text-right py-3 px-4 font-semibold ${lucroLiq >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {lucroLiq >= 0 ? '+' : ''}{formatBRL(lucroLiq)}
                    </td>
                    <td className={`text-right py-3 px-4 font-bold ${p.acumulado >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {p.acumulado >= 0 ? '+' : ''}{formatBRL(p.acumulado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
                <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300" colSpan={6}>
                  Total — {totalEtiquetas} etiquetas
                </td>
                <td className={`text-right py-3 px-4 font-black text-base ${lucroTotal >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {lucroTotal >= 0 ? '+' : ''}{formatBRL(lucroTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Conclusão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40 mt-0.5 flex-shrink-0">
              <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white mb-1">Objetivo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Competir com Superfrete na aquisição, perdendo {formatBRL(perdaPrimeiraEtiqueta)} na 1ª etiqueta para fidelizar o cliente.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 mt-0.5 flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white mb-1">Break-even</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Na {breakEvenEtiquetas + 1}ª etiqueta a perda é recuperada. Clientes fiéis = retorno garantido.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40 mt-0.5 flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white mb-1">Resultado Final</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Em {totalEtiquetas} etiquetas: <strong className={lucroTotal >= 0 ? 'text-green-600' : 'text-red-500'}>{formatBRL(lucroTotal)}</strong> líquido após Conecta+.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
