import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Package,
  Layers,
} from 'lucide-react';

const COMISSAO = 20;
const MARGEM_VAREJO = 3.5;
const MARGEM_ATACADO = 15;

type SegmentoId = 'varejo' | 'atacado' | 'hibrido';

const segmentos = [
  { id: 'varejo' as SegmentoId, label: 'Varejo', icon: ShoppingBag },
  { id: 'atacado' as SegmentoId, label: 'Atacado', icon: Package },
  { id: 'hibrido' as SegmentoId, label: 'Híbrido', icon: Layers },
];

interface CenarioConfig {
  nome: string;
  varejoCli: number;
  varejoEtiq: number;
  atacadoCli: number;
  atacadoEtiq: number;
}

const cenarios: CenarioConfig[] = [
  { nome: 'Conservador', varejoCli: 5, varejoEtiq: 30, atacadoCli: 2, atacadoEtiq: 30 },
  { nome: 'Moderado', varejoCli: 15, varejoEtiq: 50, atacadoCli: 5, atacadoEtiq: 50 },
  { nome: 'Ambicioso', varejoCli: 30, varejoEtiq: 80, atacadoCli: 10, atacadoEtiq: 80 },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calcCenario = (c: CenarioConfig) => {
  const v = c.varejoCli * c.varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
  const a = c.atacadoCli * c.atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
  return { varejo: v, atacado: a, total: v + a, anual: (v + a) * 12 };
};

const cenarioStyles = [
  { badge: 'bg-slate-700 text-slate-100', value: 'text-slate-200' },
  { badge: 'bg-orange-600 text-orange-50', value: 'text-orange-300' },
  { badge: 'bg-emerald-700 text-emerald-50', value: 'text-emerald-300' },
];

export const ProjecaoGanhosEmbed = () => {
  const [segmento, setSegmento] = useState<SegmentoId>('hibrido');
  const [varejoCli, setVarejoCli] = useState(8);
  const [varejoEtiq, setVarejoEtiq] = useState(40);
  const [atacadoCli, setAtacadoCli] = useState(4);
  const [atacadoEtiq, setAtacadoEtiq] = useState(50);

  const sim = useMemo(() => {
    const v = varejoCli * varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
    const a = atacadoCli * atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
    return { varejo: v, atacado: a, total: v + a, anual: (v + a) * 12 };
  }, [varejoCli, varejoEtiq, atacadoCli, atacadoEtiq]);

  const NumCtrl = ({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) => (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      <input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value)))} className="w-14 text-center text-base font-bold rounded-md py-1 bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#F37021]" />
      <button onClick={() => onChange(value + step)} className="w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
        <ChevronUp className="w-3 h-3 text-gray-400" />
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Segmento toggle */}
      <div className="bg-[#1a1a1a] rounded-2xl p-1 flex gap-1">
        {segmentos.map((s) => (
          <button
            key={s.id}
            onClick={() => setSegmento(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              segmento === s.id ? 'bg-[#F37021] text-white shadow-md shadow-orange-500/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Margens */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-[#1a1a1a] border border-white/5 text-center">
          <ShoppingBag className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Varejo</p>
          <p className="text-lg font-black text-white">{fmt(MARGEM_VAREJO)}</p>
          <p className="text-[10px] text-slate-600">margem/etiqueta</p>
        </div>
        <div className="p-3 rounded-xl bg-[#1a1a1a] border border-amber-900/30 text-center">
          <Package className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wider">Atacado</p>
          <p className="text-lg font-black text-amber-400">{fmt(MARGEM_ATACADO)}</p>
          <p className="text-[10px] text-amber-800">margem/etiqueta</p>
        </div>
      </div>

      {/* Cenários */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1">Cenários de ganhos</h3>
        <p className="text-xs text-gray-400 mb-3">Comissão de {COMISSAO}% sobre a margem líquida</p>

        <div className="space-y-3">
          {cenarios.map((c, idx) => {
            const calc = calcCenario(c);
            const style = cenarioStyles[idx];
            const mensal = segmento === 'varejo' ? calc.varejo : segmento === 'atacado' ? calc.atacado : calc.total;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="p-4 rounded-2xl bg-[#121212] border border-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
                    <TrendingUp className="w-3 h-3" />
                    {c.nome}
                  </span>
                  <span className="text-lg font-black text-white">{fmt(mensal)}<span className="text-[10px] text-gray-500 font-medium">/mês</span></span>
                </div>

                {segmento === 'hibrido' && (
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-[10px] text-slate-500 font-medium">Varejo</p>
                      <p className="text-sm font-bold text-slate-300">{fmt(calc.varejo)}</p>
                      <p className="text-[10px] text-slate-600">{c.varejoCli} cli · {c.varejoEtiq} etiq.</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <p className="text-[10px] text-amber-600 font-medium">Atacado</p>
                      <p className="text-sm font-bold text-amber-400">{fmt(calc.atacado)}</p>
                      <p className="text-[10px] text-amber-700">{c.atacadoCli} cli · {c.atacadoEtiq} etiq.</p>
                    </div>
                  </div>
                )}

                {segmento !== 'hibrido' && (
                  <div className="flex gap-4 text-xs text-gray-500">
                    {segmento === 'varejo' && <span><strong className="text-gray-300">{c.varejoCli}</strong> clientes · <strong className="text-gray-300">{c.varejoEtiq}</strong> etiq./mês</span>}
                    {segmento === 'atacado' && <span><strong className="text-gray-300">{c.atacadoCli}</strong> clientes · <strong className="text-gray-300">{c.atacadoEtiq}</strong> etiq./mês</span>}
                  </div>
                )}

                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-gray-600">{fmt(mensal * 12)}/ano</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Simulador */}
      <div className="rounded-2xl bg-[#121212] border border-white/5 p-4">
        <h3 className="font-semibold text-white text-sm mb-4">Simule sua operação</h3>

        <div className="p-3 rounded-xl bg-white/5 border border-white/5 mb-3">
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Varejo</span>
            <span className="text-[10px] text-slate-600 ml-auto">{fmt(MARGEM_VAREJO)}/etiq.</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Clientes</p>
              <NumCtrl value={varejoCli} onChange={setVarejoCli} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Etiq./mês</p>
              <NumCtrl value={varejoEtiq} onChange={setVarejoEtiq} step={5} min={1} />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-400">Atacado</span>
            <span className="text-[10px] text-amber-700 ml-auto">{fmt(MARGEM_ATACADO)}/etiq.</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Clientes</p>
              <NumCtrl value={atacadoCli} onChange={setAtacadoCli} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Etiq./mês</p>
              <NumCtrl value={atacadoEtiq} onChange={setAtacadoEtiq} step={5} min={1} />
            </div>
          </div>
        </div>

        {/* Resultado breakdown */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
            <span className="text-xs text-slate-400">Varejo</span>
            <span className="text-sm font-bold text-slate-300">{fmt(sim.varejo)}/mês</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5">
            <span className="text-xs text-amber-500">Atacado</span>
            <span className="text-sm font-bold text-amber-400">{fmt(sim.atacado)}/mês</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#F37021]/10 border border-[#F37021]/20 text-center">
            <p className="text-[10px] text-[#F37021] mb-0.5 font-medium">Total/mês</p>
            <p className="text-lg font-black text-[#F37021]">{fmt(sim.total)}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-[10px] text-emerald-500 mb-0.5 font-medium">Projeção anual</p>
            <p className="text-lg font-black text-emerald-400">{fmt(sim.anual)}</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-600 text-center mt-3">* Valores estimados. Resultados reais podem variar.</p>
      </div>

      {/* Tabela crescimento */}
      <div className="rounded-2xl bg-[#121212] border border-white/5 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Projeção de crescimento</h3>
          <p className="text-xs text-gray-600 mt-0.5">+2 varejo e +1 atacado/mês · 40 etiq./cliente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500">Mês</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-400">
                  <ShoppingBag className="w-3 h-3 inline mr-0.5" />Var.
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-amber-500">
                  <Package className="w-3 h-3 inline mr-0.5" />Atac.
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-[#F37021]">
                  <DollarSign className="w-3 h-3 inline mr-0.5" />Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => {
                const mes = i + 1;
                const vCom = mes * 2 * 40 * MARGEM_VAREJO * (COMISSAO / 100);
                const aCom = mes * 40 * MARGEM_ATACADO * (COMISSAO / 100);
                return (
                  <tr key={mes} className={`border-b border-white/5 ${mes === 12 ? 'bg-[#F37021]/5' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-3 py-2 font-medium text-gray-400">Mês {mes}</td>
                    <td className="px-3 py-2 text-center text-slate-400">{fmt(vCom)}</td>
                    <td className="px-3 py-2 text-center text-amber-500">{fmt(aCom)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{fmt(vCom + aCom)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
