import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  DollarSign,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const COMISSAO_PERCENTUAL = 20;
const MARGEM_MEDIA_POR_ETIQUETA = 15;

interface Cenario {
  nome: string;
  clientes: number;
  etiquetasPorCliente: number;
  cor: string;
  bgCor: string;
  borderCor: string;
}

const cenariosPadrao: Cenario[] = [
  { nome: 'Conservador', clientes: 5, etiquetasPorCliente: 30, cor: 'text-blue-600', bgCor: 'bg-blue-50', borderCor: 'border-blue-200' },
  { nome: 'Moderado', clientes: 15, etiquetasPorCliente: 50, cor: 'text-orange-600', bgCor: 'bg-orange-50', borderCor: 'border-orange-200' },
  { nome: 'Ambicioso', clientes: 30, etiquetasPorCliente: 80, cor: 'text-green-600', bgCor: 'bg-green-50', borderCor: 'border-green-200' },
];

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProjecaoGanhosEmbed = () => {
  const [clientes, setClientes] = useState(10);
  const [etiquetas, setEtiquetas] = useState(50);
  const [margemCustom, setMargemCustom] = useState(MARGEM_MEDIA_POR_ETIQUETA);

  const simulacao = useMemo(() => {
    const totalEtiquetas = clientes * etiquetas;
    const margemTotal = totalEtiquetas * margemCustom;
    const comissaoMensal = margemTotal * (COMISSAO_PERCENTUAL / 100);
    return { totalEtiquetas, margemTotal, comissaoMensal, comissaoAnual: comissaoMensal * 12 };
  }, [clientes, etiquetas, margemCustom]);

  const calcularCenario = (c: Cenario) => {
    const total = c.clientes * c.etiquetasPorCliente;
    const margem = total * MARGEM_MEDIA_POR_ETIQUETA;
    const mensal = margem * (COMISSAO_PERCENTUAL / 100);
    return { total, mensal, anual: mensal * 12 };
  };

  return (
    <div className="space-y-6">
      {/* Cenários */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1">Cenários de ganhos</h3>
        <p className="text-xs text-gray-400 mb-4">
          Margem média de {formatCurrency(MARGEM_MEDIA_POR_ETIQUETA)}/etiqueta · {COMISSAO_PERCENTUAL}% de comissão
        </p>

        <div className="space-y-3">
          {cenariosPadrao.map((cenario, idx) => {
            const calc = calcularCenario(cenario);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`p-4 rounded-2xl bg-white border ${cenario.borderCor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${cenario.cor}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {cenario.nome}
                  </div>
                  <span className={`text-lg font-black ${cenario.cor}`}>{formatCurrency(calc.mensal)}<span className="text-xs font-medium text-gray-400">/mês</span></span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span><strong className="text-gray-700">{cenario.clientes}</strong> clientes</span>
                  <span><strong className="text-gray-700">{cenario.etiquetasPorCliente}</strong> etiq./mês</span>
                  <span className="ml-auto text-gray-400">{formatCurrency(calc.anual)}/ano</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Simulador */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Simule seus ganhos</h3>
        
        <div className="space-y-4 mb-6">
          {/* Clientes */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Clientes indicados</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setClientes(Math.max(1, clientes - 1))} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              <input type="number" min={1} max={500} value={clientes} onChange={(e) => setClientes(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-xl font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
              <button onClick={() => setClientes(clientes + 1)} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Etiquetas/mês por cliente</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setEtiquetas(Math.max(1, etiquetas - 5))} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              <input type="number" min={1} max={5000} value={etiquetas} onChange={(e) => setEtiquetas(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-xl font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
              <button onClick={() => setEtiquetas(etiquetas + 5)} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Margem */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Margem média (R$)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setMargemCustom(Math.max(0.5, +(margemCustom - 0.5).toFixed(2)))} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              <input type="number" min={0.5} step={0.5} value={margemCustom} onChange={(e) => setMargemCustom(Math.max(0.5, Number(e.target.value)))} className="flex-1 text-center text-xl font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
              <button onClick={() => setMargemCustom(+(margemCustom + 0.5).toFixed(2))} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Etiquetas/mês</p>
            <p className="text-lg font-black text-gray-900">{simulacao.totalEtiquetas.toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Margem total</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(simulacao.margemTotal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
            <p className="text-[10px] text-orange-500 mb-0.5">Comissão/mês</p>
            <p className="text-lg font-black text-orange-600">{formatCurrency(simulacao.comissaoMensal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-center">
            <p className="text-[10px] text-green-600 mb-0.5">Projeção anual</p>
            <p className="text-lg font-black text-green-700">{formatCurrency(simulacao.comissaoAnual)}</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-3">
          * Valores estimados. Resultados reais podem variar.
        </p>
      </div>

      {/* Tabela crescimento */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Projeção de crescimento</h3>
          <p className="text-xs text-gray-400 mt-0.5">2 novos clientes/mês · 40 etiq./cliente</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500">Mês</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500">
                  <Users className="w-3 h-3 inline mr-1" />Clientes
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-500">
                  <DollarSign className="w-3 h-3 inline mr-1" />Comissão
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => {
                const mes = i + 1;
                const clientesAcumulados = mes * 2;
                const comissaoMes = clientesAcumulados * 40 * MARGEM_MEDIA_POR_ETIQUETA * (COMISSAO_PERCENTUAL / 100);
                return (
                  <tr key={mes} className={`border-b border-gray-50 ${mes === 12 ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-3 py-2 font-medium text-gray-700">Mês {mes}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{clientesAcumulados}</td>
                    <td className="px-3 py-2 text-right font-semibold text-orange-600">{formatCurrency(comissaoMes)}</td>
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
