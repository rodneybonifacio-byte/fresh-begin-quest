import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  Calculator,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const COMISSAO_PERCENTUAL = 20; // 20% da margem líquida
const MARGEM_MEDIA_POR_ETIQUETA = 15; // R$ margem média por etiqueta (atacado)

interface Cenario {
  nome: string;
  clientes: number;
  etiquetasPorCliente: number;
  cor: string;
  bgCor: string;
  borderCor: string;
}

const cenariosPadrao: Cenario[] = [
  {
    nome: 'Conservador',
    clientes: 5,
    etiquetasPorCliente: 30,
    cor: 'text-blue-600',
    bgCor: 'bg-blue-50',
    borderCor: 'border-blue-200',
  },
  {
    nome: 'Moderado',
    clientes: 15,
    etiquetasPorCliente: 50,
    cor: 'text-orange-600',
    bgCor: 'bg-orange-50',
    borderCor: 'border-orange-200',
  },
  {
    nome: 'Ambicioso',
    clientes: 30,
    etiquetasPorCliente: 80,
    cor: 'text-green-600',
    bgCor: 'bg-green-50',
    borderCor: 'border-green-200',
  },
];

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

  // Simulador personalizado
  const [clientes, setClientes] = useState(10);
  const [etiquetas, setEtiquetas] = useState(50);
  const [margemCustom, setMargemCustom] = useState(MARGEM_MEDIA_POR_ETIQUETA);

  const simulacao = useMemo(() => {
    const totalEtiquetas = clientes * etiquetas;
    const margemTotal = totalEtiquetas * margemCustom;
    const comissaoMensal = margemTotal * (COMISSAO_PERCENTUAL / 100);
    return {
      totalEtiquetas,
      margemTotal,
      comissaoMensal,
      comissaoAnual: comissaoMensal * 12,
    };
  }, [clientes, etiquetas, margemCustom]);

  const calcularCenario = (c: Cenario) => {
    const total = c.clientes * c.etiquetasPorCliente;
    const margem = total * MARGEM_MEDIA_POR_ETIQUETA;
    const mensal = margem * (COMISSAO_PERCENTUAL / 100);
    return { total, margem, mensal, anual: mensal * 12 };
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/conecta')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg text-white">
              C+
            </div>
            <span className="text-xl font-bold text-gray-900">Conecta+</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/conecta')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Programa
            </button>
            <button onClick={() => navigate('/home')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Home
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/conecta/login')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/conecta/cadastro')}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Quero ser parceiro
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-100/40 rounded-full blur-[100px]" />
        </div>

        <motion.div
          className="container mx-auto max-w-4xl relative z-10 text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-sm font-medium">
              <Calculator className="w-4 h-4" />
              Simulador de Ganhos
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            Quanto você pode{' '}
            <span className="text-orange-500">ganhar?</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl text-gray-500 max-w-2xl mx-auto mb-4">
            Veja projeções reais de ganhos como parceiro Conecta+. Comissão de{' '}
            <strong className="text-orange-500">20% sobre a margem líquida</strong> de cada frete
            emitido pelos seus indicados.
          </motion.p>
        </motion.div>
      </section>

      {/* Cenários pré-definidos */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">
              Cenários de ganhos
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Baseado em margem média de {formatCurrency(MARGEM_MEDIA_POR_ETIQUETA)} por etiqueta e{' '}
              {COMISSAO_PERCENTUAL}% de comissão vitalícia.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {cenariosPadrao.map((cenario, idx) => {
              const calc = calcularCenario(cenario);
              return (
                <motion.div
                  key={idx}
                  className={`p-6 rounded-2xl bg-white border ${cenario.borderCor} shadow-sm hover:shadow-lg transition-all`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${cenario.bgCor} ${cenario.cor} text-sm font-semibold mb-4`}>
                    <TrendingUp className="w-4 h-4" />
                    {cenario.nome}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">
                        <strong className="text-gray-900">{cenario.clientes}</strong> clientes indicados
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">
                        <strong className="text-gray-900">{cenario.etiquetasPorCliente}</strong> etiquetas/mês por cliente
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Etiquetas/mês</span>
                      <span className="font-semibold">{calc.total.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Comissão/mês</span>
                      <span className={`font-bold text-lg ${cenario.cor}`}>
                        {formatCurrency(calc.mensal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Projeção anual</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(calc.anual)}
                      </span>
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
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">
              Simule seus ganhos
            </h2>
            <p className="text-gray-500">Ajuste os valores e veja sua projeção personalizada.</p>
          </motion.div>

          <motion.div
            className="p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-orange-50/30 border border-gray-200 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid sm:grid-cols-3 gap-8 mb-10">
              {/* Clientes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Clientes indicados
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setClientes(Math.max(1, clientes - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={clientes}
                    onChange={(e) => setClientes(Math.max(1, Number(e.target.value)))}
                    className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                  <button
                    onClick={() => setClientes(clientes + 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Etiquetas por cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Etiquetas/mês por cliente
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtiquetas(Math.max(1, etiquetas - 5))}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={etiquetas}
                    onChange={(e) => setEtiquetas(Math.max(1, Number(e.target.value)))}
                    className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                  <button
                    onClick={() => setEtiquetas(etiquetas + 5)}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Margem média */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Margem média (R$)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMargemCustom(Math.max(0.5, +(margemCustom - 0.5).toFixed(2)))}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={margemCustom}
                    onChange={(e) => setMargemCustom(Math.max(0.5, Number(e.target.value)))}
                    className="flex-1 text-center text-2xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                  <button
                    onClick={() => setMargemCustom(+(margemCustom + 0.5).toFixed(2))}
                    className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-1">Etiquetas/mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  {simulacao.totalEtiquetas.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-1">Margem total/mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(simulacao.margemTotal)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-center">
                <p className="text-xs text-orange-500 mb-1">Sua comissão/mês</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(simulacao.comissaoMensal)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-green-600 mb-1">Projeção anual</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(simulacao.comissaoAnual)}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              * Valores estimados com base na margem média informada. Resultados reais podem variar.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabela de crescimento */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">
              Projeção de crescimento
            </h2>
            <p className="text-gray-500">
              Imagine conquistar 2 novos clientes por mês. Veja como seus ganhos crescem:
            </p>
          </motion.div>

          <motion.div
            className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-semibold text-gray-600">Mês</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600">Clientes acumulados</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-600">Etiquetas/mês</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-600">Comissão/mês</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-600">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const mes = i + 1;
                  const clientesAcumulados = mes * 2;
                  const etiquetasMes = clientesAcumulados * 40;
                  const comissaoMes = etiquetasMes * MARGEM_MEDIA_POR_ETIQUETA * (COMISSAO_PERCENTUAL / 100);
                  const acumulado = Array.from({ length: mes }, (_, j) => {
                    const c = (j + 1) * 2;
                    return c * 40 * MARGEM_MEDIA_POR_ETIQUETA * (COMISSAO_PERCENTUAL / 100);
                  }).reduce((a, b) => a + b, 0);

                  return (
                    <tr key={mes} className={`border-b border-gray-50 ${mes === 12 ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-3 font-medium text-gray-900">Mês {mes}</td>
                      <td className="px-6 py-3 text-center text-gray-700">{clientesAcumulados}</td>
                      <td className="px-6 py-3 text-center text-gray-700">{etiquetasMes.toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-3 text-right font-semibold text-orange-600">
                        {formatCurrency(comissaoMes)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-green-700">
                        {formatCurrency(acumulado)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          <p className="text-xs text-gray-400 text-center mt-3">
            * Simulação com 2 novos clientes/mês, 40 etiquetas/cliente e margem de {formatCurrency(MARGEM_MEDIA_POR_ETIQUETA)}/etiqueta.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Comece a ganhar agora!
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-lg mx-auto">
                Cadastre-se gratuitamente e transforme suas indicações em renda recorrente.
              </p>
              <button
                onClick={() => navigate('/conecta/cadastro')}
                className="group flex items-center gap-3 px-10 py-5 bg-white text-orange-600 hover:bg-gray-100 rounded-full text-xl font-semibold transition-all shadow-2xl mx-auto"
              >
                Quero ser parceiro
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm text-white">
                C+
              </div>
              <span className="font-semibold text-gray-600">BRHUB Conecta+</span>
            </div>
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
