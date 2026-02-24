import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
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
  { id: 'varejo' as SegmentoId, label: 'Varejo', icon: ShoppingBag, margem: MARGEM_VAREJO, cor: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', ring: 'ring-sky-500' },
  { id: 'atacado' as SegmentoId, label: 'Atacado', icon: Package, margem: MARGEM_ATACADO, cor: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', ring: 'ring-violet-500' },
  { id: 'hibrido' as SegmentoId, label: 'Híbrido', icon: Layers, margem: 0, cor: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-500' },
];

interface CenarioConfig {
  nome: string;
  varejoCli: number;
  varejoEtiq: number;
  atacadoCli: number;
  atacadoEtiq: number;
  cor: string;
  bgCor: string;
  borderCor: string;
}

const cenarios: CenarioConfig[] = [
  { nome: 'Conservador', varejoCli: 5, varejoEtiq: 30, atacadoCli: 2, atacadoEtiq: 30, cor: 'text-blue-600', bgCor: 'bg-blue-50', borderCor: 'border-blue-200' },
  { nome: 'Moderado', varejoCli: 15, varejoEtiq: 50, atacadoCli: 5, atacadoEtiq: 50, cor: 'text-orange-600', bgCor: 'bg-orange-50', borderCor: 'border-orange-200' },
  { nome: 'Ambicioso', varejoCli: 30, varejoEtiq: 80, atacadoCli: 10, atacadoEtiq: 80, cor: 'text-green-600', bgCor: 'bg-green-50', borderCor: 'border-green-200' },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calcCenario = (c: CenarioConfig) => {
  const varejoMensal = c.varejoCli * c.varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
  const atacadoMensal = c.atacadoCli * c.atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
  const total = varejoMensal + atacadoMensal;
  return { varejoMensal, atacadoMensal, total, anual: total * 12, totalCli: c.varejoCli + c.atacadoCli };
};

export const ProjecaoGanhosEmbed = () => {
  const [segmento, setSegmento] = useState<SegmentoId>('hibrido');

  // Simulador
  const [varejoCli, setVarejoCli] = useState(8);
  const [varejoEtiq, setVarejoEtiq] = useState(40);
  const [atacadoCli, setAtacadoCli] = useState(4);
  const [atacadoEtiq, setAtacadoEtiq] = useState(50);

  const sim = useMemo(() => {
    const vMensal = varejoCli * varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
    const aMensal = atacadoCli * atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
    return {
      varejo: vMensal,
      atacado: aMensal,
      total: vMensal + aMensal,
      anual: (vMensal + aMensal) * 12,
      etiquetasTotal: varejoCli * varejoEtiq + atacadoCli * atacadoEtiq,
    };
  }, [varejoCli, varejoEtiq, atacadoCli, atacadoEtiq]);

  const NumberInput = ({ value, onChange, step = 1, min = 1 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(min, value - step))} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>
      <input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value)))} className="w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
      <button onClick={() => onChange(value + step)} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Segmento toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
        {segmentos.map((s) => (
          <button
            key={s.id}
            onClick={() => setSegmento(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              segmento === s.id ? 'bg-[#121212] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Margens info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center">
          <ShoppingBag className="w-4 h-4 text-sky-500 mx-auto mb-1" />
          <p className="text-[10px] text-sky-600 font-medium">Varejo</p>
          <p className="text-lg font-black text-sky-700">{fmt(MARGEM_VAREJO)}</p>
          <p className="text-[10px] text-sky-400">margem/etiqueta</p>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
          <Package className="w-4 h-4 text-violet-500 mx-auto mb-1" />
          <p className="text-[10px] text-violet-600 font-medium">Atacado</p>
          <p className="text-lg font-black text-violet-700">{fmt(MARGEM_ATACADO)}</p>
          <p className="text-[10px] text-violet-400">margem/etiqueta</p>
        </div>
      </div>

      {/* Cenários */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1">Cenários de ganhos</h3>
        <p className="text-xs text-gray-400 mb-4">Comissão de {COMISSAO}% sobre a margem líquida</p>

        <div className="space-y-3">
          {cenarios.map((c, idx) => {
            const calc = calcCenario(c);
            const showVarejo = segmento === 'varejo' || segmento === 'hibrido';
            const showAtacado = segmento === 'atacado' || segmento === 'hibrido';
            const mensal = segmento === 'varejo' ? calc.varejoMensal : segmento === 'atacado' ? calc.atacadoMensal : calc.total;
            const anual = mensal * 12;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`p-4 rounded-2xl bg-white border ${c.borderCor}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${c.cor}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {c.nome}
                  </div>
                  <span className={`text-lg font-black ${c.cor}`}>{fmt(mensal)}<span className="text-xs font-medium text-gray-400">/mês</span></span>
                </div>

                {segmento === 'hibrido' && (
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 p-2 rounded-lg bg-sky-50/60 border border-sky-100">
                      <p className="text-[10px] text-sky-500 font-medium">Varejo</p>
                      <p className="text-sm font-bold text-sky-700">{fmt(calc.varejoMensal)}</p>
                      <p className="text-[10px] text-sky-400">{c.varejoCli} cli · {c.varejoEtiq} etiq.</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-violet-50/60 border border-violet-100">
                      <p className="text-[10px] text-violet-500 font-medium">Atacado</p>
                      <p className="text-sm font-bold text-violet-700">{fmt(calc.atacadoMensal)}</p>
                      <p className="text-[10px] text-violet-400">{c.atacadoCli} cli · {c.atacadoEtiq} etiq.</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 text-xs text-gray-500">
                  {showVarejo && segmento !== 'hibrido' && <span><strong className="text-gray-700">{c.varejoCli}</strong> clientes · <strong className="text-gray-700">{c.varejoEtiq}</strong> etiq./mês</span>}
                  {showAtacado && segmento !== 'hibrido' && <span><strong className="text-gray-700">{c.atacadoCli}</strong> clientes · <strong className="text-gray-700">{c.atacadoEtiq}</strong> etiq./mês</span>}
                  <span className="ml-auto text-gray-400">{fmt(anual)}/ano</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Simulador personalizado */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Simule sua operação</h3>

        {/* Varejo inputs */}
        <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 mb-3">
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-xs font-semibold text-sky-700">Varejo</span>
            <span className="text-[10px] text-sky-400 ml-auto">margem {fmt(MARGEM_VAREJO)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Clientes</p>
              <NumberInput value={varejoCli} onChange={setVarejoCli} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Etiq./mês</p>
              <NumberInput value={varejoEtiq} onChange={setVarejoEtiq} step={5} />
            </div>
          </div>
        </div>

        {/* Atacado inputs */}
        <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Package className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-violet-700">Atacado</span>
            <span className="text-[10px] text-violet-400 ml-auto">margem {fmt(MARGEM_ATACADO)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Clientes</p>
              <NumberInput value={atacadoCli} onChange={setAtacadoCli} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Etiq./mês</p>
              <NumberInput value={atacadoEtiq} onChange={setAtacadoEtiq} step={5} />
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50 border border-sky-100">
            <span className="text-xs text-sky-600 font-medium">Comissão Varejo</span>
            <span className="text-sm font-bold text-sky-700">{fmt(sim.varejo)}/mês</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <span className="text-xs text-violet-600 font-medium">Comissão Atacado</span>
            <span className="text-sm font-bold text-violet-700">{fmt(sim.atacado)}/mês</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
            <p className="text-[10px] text-orange-500 mb-0.5">Total/mês</p>
            <p className="text-lg font-black text-orange-600">{fmt(sim.total)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-center">
            <p className="text-[10px] text-green-600 mb-0.5">Projeção anual</p>
            <p className="text-lg font-black text-green-700">{fmt(sim.anual)}</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-3">* Valores estimados. Resultados reais podem variar.</p>
      </div>

      {/* Tabela crescimento híbrido */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Projeção de crescimento</h3>
          <p className="text-xs text-gray-400 mt-0.5">+2 varejo e +1 atacado/mês · 40 etiq./cliente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500">Mês</th>
                <th className="px-3 py-2.5 text-center font-semibold text-sky-500">
                  <ShoppingBag className="w-3 h-3 inline mr-0.5" />Var.
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-violet-500">
                  <Package className="w-3 h-3 inline mr-0.5" />Atac.
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-orange-500">
                  <DollarSign className="w-3 h-3 inline mr-0.5" />Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => {
                const mes = i + 1;
                const vCli = mes * 2;
                const aCli = mes;
                const vCom = vCli * 40 * MARGEM_VAREJO * (COMISSAO / 100);
                const aCom = aCli * 40 * MARGEM_ATACADO * (COMISSAO / 100);
                return (
                  <tr key={mes} className={`border-b border-gray-50 ${mes === 12 ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-3 py-2 font-medium text-gray-700">Mês {mes}</td>
                    <td className="px-3 py-2 text-center text-sky-600">{fmt(vCom)}</td>
                    <td className="px-3 py-2 text-center text-violet-600">{fmt(aCom)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-orange-600">{fmt(vCom + aCom)}</td>
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
