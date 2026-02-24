import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calculator,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Package,
  Layers,
} from 'lucide-react';
import { ConectaNavbar } from './components/ConectaNavbar';
import { ConectaFooter } from './components/ConectaFooter';
import { ConectaBanner } from './components/ConectaBanner';

const COMISSAO = 20;
const MARGEM_VAREJO = 3.5;
const MARGEM_ATACADO = 15;

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
  const v = c.varejoCli * c.varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
  const a = c.atacadoCli * c.atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
  return { varejo: v, atacado: a, total: v + a, anual: (v + a) * 12 };
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function ProjecaoGanhos() {
  const navigate = useNavigate();

  const [varejoCli, setVarejoCli] = useState(8);
  const [varejoEtiq, setVarejoEtiq] = useState(40);
  const [atacadoCli, setAtacadoCli] = useState(4);
  const [atacadoEtiq, setAtacadoEtiq] = useState(50);

  const sim = useMemo(() => {
    const v = varejoCli * varejoEtiq * MARGEM_VAREJO * (COMISSAO / 100);
    const a = atacadoCli * atacadoEtiq * MARGEM_ATACADO * (COMISSAO / 100);
    return { varejo: v, atacado: a, total: v + a, anual: (v + a) * 12 };
  }, [varejoCli, varejoEtiq, atacadoCli, atacadoEtiq]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      <ConectaNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-100/40 rounded-full blur-[100px]" />
        </div>
        <motion.div className="container mx-auto max-w-4xl relative z-10 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-sm font-medium">
              <Calculator className="w-4 h-4" />Simulador de Ganhos
            </span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Quanto você pode <span className="text-orange-500">ganhar?</span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-xl text-gray-500 max-w-2xl mx-auto mb-4">
            Projeções reais para operações de <strong className="text-sky-500">varejo</strong>, <strong className="text-violet-500">atacado</strong> e <strong className="text-orange-500">híbrida</strong>. Comissão de 20% sobre a margem líquida.
          </motion.p>
        </motion.div>
      </section>
      {/* Banner Conecta+ */}
      <ConectaBanner variant="programa" className="py-10 bg-white" />

      {/* Margens por segmento */}
      <section className="py-12 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div className="p-6 rounded-2xl bg-sky-50 border border-sky-200 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <ShoppingBag className="w-8 h-8 text-sky-500 mx-auto mb-2" />
              <h3 className="font-bold text-sky-700 text-lg mb-1">Varejo</h3>
              <p className="text-3xl font-black text-sky-600 mb-1">{fmt(MARGEM_VAREJO)}</p>
              <p className="text-sm text-sky-400">margem média por etiqueta</p>
            </motion.div>
            <motion.div className="p-6 rounded-2xl bg-violet-50 border border-violet-200 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Package className="w-8 h-8 text-violet-500 mx-auto mb-2" />
              <h3 className="font-bold text-violet-700 text-lg mb-1">Atacado</h3>
              <p className="text-3xl font-black text-violet-600 mb-1">{fmt(MARGEM_ATACADO)}</p>
              <p className="text-sm text-violet-400">margem média por etiqueta</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Cenários híbridos */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">Cenários de ganhos — Operação Híbrida</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Combinando clientes varejo e atacado com {COMISSAO}% de comissão vitalícia.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {cenarios.map((c, idx) => {
              const calc = calcCenario(c);
              return (
                <motion.div key={idx} className={`p-6 rounded-2xl bg-white border ${c.borderCor} shadow-sm hover:shadow-lg transition-all`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${c.bgCor} ${c.cor} text-sm font-semibold mb-4`}>
                    <TrendingUp className="w-4 h-4" />{c.nome}
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />
                        <span className="text-xs font-semibold text-sky-700">Varejo</span>
                      </div>
                      <p className="text-sm font-bold text-sky-600">{fmt(calc.varejo)}/mês</p>
                      <p className="text-xs text-sky-400">{c.varejoCli} cli · {c.varejoEtiq} etiq.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-xs font-semibold text-violet-700">Atacado</span>
                      </div>
                      <p className="text-sm font-bold text-violet-600">{fmt(calc.atacado)}/mês</p>
                      <p className="text-xs text-violet-400">{c.atacadoCli} cli · {c.atacadoEtiq} etiq.</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Total/mês</span>
                      <span className={`font-bold text-lg ${c.cor}`}>{fmt(calc.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Projeção anual</span>
                      <span className="font-bold text-gray-900">{fmt(calc.anual)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Simulador interativo */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">Simule sua operação</h2>
            <p className="text-gray-500">Ajuste clientes de varejo e atacado separadamente.</p>
          </motion.div>

          <motion.div className="p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-orange-50/30 border border-gray-200 shadow-sm" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {/* Varejo */}
              <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-5 h-5 text-sky-500" />
                  <h3 className="font-bold text-sky-700">Varejo</h3>
                  <span className="text-xs text-sky-400 ml-auto">margem {fmt(MARGEM_VAREJO)}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Clientes</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setVarejoCli(Math.max(0, varejoCli - 1))} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronDown className="w-4 h-4" /></button>
                      <input type="number" min={0} value={varejoCli} onChange={(e) => setVarejoCli(Math.max(0, Number(e.target.value)))} className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                      <button onClick={() => setVarejoCli(varejoCli + 1)} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronUp className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Etiquetas/mês por cliente</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setVarejoEtiq(Math.max(1, varejoEtiq - 5))} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronDown className="w-4 h-4" /></button>
                      <input type="number" min={1} value={varejoEtiq} onChange={(e) => setVarejoEtiq(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                      <button onClick={() => setVarejoEtiq(varejoEtiq + 5)} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronUp className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Atacado */}
              <div className="p-5 rounded-2xl bg-violet-50/60 border border-violet-200">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-violet-500" />
                  <h3 className="font-bold text-violet-700">Atacado</h3>
                  <span className="text-xs text-violet-400 ml-auto">margem {fmt(MARGEM_ATACADO)}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Clientes</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAtacadoCli(Math.max(0, atacadoCli - 1))} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronDown className="w-4 h-4" /></button>
                      <input type="number" min={0} value={atacadoCli} onChange={(e) => setAtacadoCli(Math.max(0, Number(e.target.value)))} className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                      <button onClick={() => setAtacadoCli(atacadoCli + 1)} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronUp className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Etiquetas/mês por cliente</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAtacadoEtiq(Math.max(1, atacadoEtiq - 5))} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronDown className="w-4 h-4" /></button>
                      <input type="number" min={1} value={atacadoEtiq} onChange={(e) => setAtacadoEtiq(Math.max(1, Number(e.target.value)))} className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                      <button onClick={() => setAtacadoEtiq(atacadoEtiq + 5)} className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"><ChevronUp className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-center">
                <p className="text-xs text-sky-500 mb-1">Comissão Varejo</p>
                <p className="text-2xl font-bold text-sky-600">{fmt(sim.varejo)}</p>
              </div>
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 text-center">
                <p className="text-xs text-violet-500 mb-1">Comissão Atacado</p>
                <p className="text-2xl font-bold text-violet-600">{fmt(sim.atacado)}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-center">
                <p className="text-xs text-orange-500 mb-1">Total/mês</p>
                <p className="text-2xl font-bold text-orange-600">{fmt(sim.total)}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-green-600 mb-1">Projeção anual</p>
                <p className="text-2xl font-bold text-green-700">{fmt(sim.anual)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">* Valores estimados. Resultados reais podem variar.</p>
          </motion.div>
        </div>
      </section>

      {/* Tabela de crescimento híbrido */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">Projeção de crescimento</h2>
            <p className="text-gray-500">+2 clientes varejo e +1 atacado por mês · 40 etiquetas/cliente</p>
          </motion.div>

          <motion.div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-4 text-left font-semibold text-gray-600">Mês</th>
                  <th className="px-5 py-4 text-center font-semibold text-sky-600"><ShoppingBag className="w-4 h-4 inline mr-1" />Varejo</th>
                  <th className="px-5 py-4 text-center font-semibold text-violet-600"><Package className="w-4 h-4 inline mr-1" />Atacado</th>
                  <th className="px-5 py-4 text-right font-semibold text-orange-600"><DollarSign className="w-4 h-4 inline mr-1" />Total/mês</th>
                  <th className="px-5 py-4 text-right font-semibold text-green-600">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let acumulado = 0;
                  return Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    const vCom = mes * 2 * 40 * MARGEM_VAREJO * (COMISSAO / 100);
                    const aCom = mes * 40 * MARGEM_ATACADO * (COMISSAO / 100);
                    const total = vCom + aCom;
                    acumulado += total;
                    return (
                      <tr key={mes} className={`border-b border-gray-50 ${mes === 12 ? 'bg-orange-50/50 font-semibold' : 'hover:bg-gray-50'}`}>
                        <td className="px-5 py-3 font-medium text-gray-900">Mês {mes}</td>
                        <td className="px-5 py-3 text-center text-sky-600">{fmt(vCom)}</td>
                        <td className="px-5 py-3 text-center text-violet-600">{fmt(aCom)}</td>
                        <td className="px-5 py-3 text-right text-orange-600 font-semibold">{fmt(total)}</td>
                        <td className="px-5 py-3 text-right text-green-700 font-semibold">{fmt(acumulado)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-center overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Comece a ganhar agora!</h2>
              <p className="text-xl text-white/90 mb-8 max-w-lg mx-auto">Cadastre-se gratuitamente e transforme suas indicações em renda recorrente.</p>
              <button onClick={() => navigate('/conecta/cadastro')} className="group flex items-center gap-3 px-10 py-5 bg-white text-orange-600 hover:bg-gray-100 rounded-full text-xl font-semibold transition-all shadow-2xl mx-auto">
                Quero ser parceiro
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <ConectaFooter />
    </div>
  );
}
