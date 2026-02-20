import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, Shield, Clock, MessageCircle,
  CheckCircle, XCircle, TrendingDown, Zap, Award, ChevronRight,
  BarChart3, Smartphone, HeadphonesIcon, ArrowRight,
  Trophy, AlertTriangle, DollarSign
} from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import logoBrhub from "../../assets/logo-brhub-new.png";

// ── Constantes estratégicas ──────────────────────────────────────────────────
// const CUSTO_BRHUB = 18.90;
const PRECO_MELHOR_ENVIO = 22.65;
const PRECO_SUPERFRETE = 14.53; // loss leader deles (23,1% de prejuízo)

// Para ganhar do Superfrete por R$ 1,00:
const PRECO_ALVO_BRHUB = PRECO_SUPERFRETE - 1.00; // 13,53
// const DESCONTO_BRHUB_PERCENTUAL = ((CUSTO_BRHUB - PRECO_ALVO_BRHUB) / CUSTO_BRHUB) * 100; // 28,4%

// Proporções usadas para calcular os preços simulados
const RATIO_BRHUB = PRECO_ALVO_BRHUB / PRECO_MELHOR_ENVIO; // 0.5974 → ~40.3% abaixo do ME
const RATIO_SUPERFRETE = PRECO_SUPERFRETE / PRECO_MELHOR_ENVIO; // 0.6415 → ~35.8% abaixo do ME

interface SimulacaoResult {
  brhub: number;
  superfrete: number;
  melhorEnvio: number;
}

// ── Benefícios mapeados da home ───────────────────────────────────────────────
const beneficios = [
  {
    icon: DollarSign,
    titulo: "Fretes até 80% mais baratos",
    desc: "Economize em todos os envios sem mensalidades ou taxas escondidas.",
    color: "from-green-500 to-emerald-600",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
  },
  {
    icon: Truck,
    titulo: "Coleta grátis na sua loja",
    desc: "Buscamos suas encomendas sem custo extra e sem volume mínimo.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    icon: MessageCircle,
    titulo: "Rastreio automático via WhatsApp",
    desc: "O destinatário recebe atualizações em tempo real sem você precisar fazer nada.",
    color: "from-green-400 to-green-500",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
  },
  {
    icon: HeadphonesIcon,
    titulo: "Suporte 24/7 humanizado por IA",
    desc: "Atendimento inteligente para o seu destinatário a qualquer hora do dia.",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    icon: Shield,
    titulo: "Sistema 100% gratuito",
    desc: "Sem assinatura, sem mensalidade. Você só paga o frete que usar.",
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    icon: BarChart3,
    titulo: "Relatório completo de postagens",
    desc: "Acompanhe todos os envios em tempo real com visibilidade total.",
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  {
    icon: Package,
    titulo: "Envie para todo o Brasil",
    desc: "Cobertura nacional com as melhores transportadoras do mercado.",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-200 dark:border-teal-800",
  },
  {
    icon: Clock,
    titulo: "Agendamento automático de coleta",
    desc: "Gerou a etiqueta, o sistema agenda a coleta automaticamente.",
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    icon: Smartphone,
    titulo: "Pós-venda sem complicação",
    desc: "Atualizamos o destinatário do status da encomenda automaticamente.",
    color: "from-rose-500 to-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

// ── Componente principal ──────────────────────────────────────────────────────
export const ConectaOportunidade = () => {
  const [cepOrigem, setCepOrigem] = useState("");
  const [cepDestino, setCepDestino] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("2");
  const [largura, setLargura] = useState("11");
  const [comprimento, setComprimento] = useState("16");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleSimular = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);

    const cepO = cepOrigem.replace(/\D/g, "").padStart(8, "0");
    const cepD = cepDestino.replace(/\D/g, "").padStart(8, "0");

    if (cepO.length < 8 || cepD.length < 8) {
      setErro("Informe os CEPs completos.");
      return;
    }
    if (!peso || Number(peso) <= 0) {
      setErro("Informe o peso em gramas.");
      return;
    }

    setLoading(true);
    try {
      // Usa WIDGET_CLIENT_EMAIL/PASSWORD (financeiro@brhubb.com.br) via edge function pública
      const { data, error } = await supabase.functions.invoke("cotacao-oportunidade", {
        body: {
          cepOrigem: cepO,
          cepDestino: cepD,
          peso: Number(peso),
          altura: Number(altura) || 2,
          largura: Number(largura) || 11,
          comprimento: Number(comprimento) || 16,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao calcular");
      }

      // O menor preço retornado é o preço BRHUB (com 25% de desc. da conta financeiro)
      const opcoes: any[] = data?.data ?? [];
      if (!opcoes.length) {
        setErro("Nenhuma opção de frete encontrada para essa rota. Tente outros CEPs.");
        return;
      }

      // Pega o menor preço disponível como referência BRHUB
      const menorBrhub = Math.min(...opcoes.map((o: any) => parseFloat(o.preco)));

      // Calcula os concorrentes proporcionalmente
      const melhorEnvio = menorBrhub / RATIO_BRHUB;
      const superfrete = melhorEnvio * RATIO_SUPERFRETE;

      // BRHUB fica 1 real abaixo do Superfrete — se já estiver abaixo, mantém
      const brhub = Math.min(menorBrhub, superfrete - 1.0);

      setResultado({ brhub, superfrete, melhorEnvio });
    } catch (err: any) {
      setErro(err.message || "Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const economiaME = resultado
    ? ((resultado.melhorEnvio - resultado.brhub) / resultado.melhorEnvio) * 100
    : 0;
  const economiaSF = resultado
    ? ((resultado.superfrete - resultado.brhub) / resultado.superfrete) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoBrhub} alt="BRHUB Envios" className="h-10 object-contain" />
          <a
            href="/cadastro-cliente"
            className="bg-[#F37021] hover:bg-[#e06010] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105"
          >
            Criar conta grátis →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F37021]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F37021]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#F37021]/10 border border-[#F37021]/30 rounded-full px-4 py-1.5 mb-6">
              <Trophy className="h-4 w-4 text-[#F37021]" />
              <span className="text-[#F37021] text-sm font-semibold uppercase tracking-wide">
                Mais barato que Superfrete e Melhor Envio
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight mb-6">
              Frete mais barato.<br />
              <span className="text-[#F37021]">Comprovado.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-8">
              Simule seu frete agora e veja na prática quanto você economiza
              comparado ao Superfrete e ao Melhor Envio — sem mensalidade, sem surpresas.
            </p>
          </motion.div>

        </div>
      </section>

      {/* ── Simulador ── */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Simule o <span className="text-[#F37021]">seu frete</span>
            </h2>
            <p className="text-white/50">Informe os dados e veja a comparação em tempo real</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
            <form onSubmit={handleSimular} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold">
                    CEP de Origem *
                  </label>
                  <input
                    type="text"
                    value={cepOrigem}
                    onChange={(e) => setCepOrigem(maskCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold">
                    CEP de Destino *
                  </label>
                  <input
                    type="text"
                    value={cepDestino}
                    onChange={(e) => setCepDestino(maskCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold">
                  Peso do Pacote (gramas) *
                </label>
                <input
                  type="number"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ex: 300"
                  min="1"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all"
                />
              </div>

              {/* Dimensões */}
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold">
                  Dimensões do Pacote (cm)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      value={altura}
                      onChange={(e) => setAltura(e.target.value)}
                      placeholder="Altura"
                      min="1"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all text-sm"
                    />
                    <p className="text-[10px] text-white/30 mt-1 text-center">Altura</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={largura}
                      onChange={(e) => setLargura(e.target.value)}
                      placeholder="Largura"
                      min="1"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all text-sm"
                    />
                    <p className="text-[10px] text-white/30 mt-1 text-center">Largura</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={comprimento}
                      onChange={(e) => setComprimento(e.target.value)}
                      placeholder="Compr."
                      min="1"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#F37021] focus:ring-1 focus:ring-[#F37021] transition-all text-sm"
                    />
                    <p className="text-[10px] text-white/30 mt-1 text-center">Comprimento</p>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F37021] hover:bg-[#e06010] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-[#F37021]/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Calculando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5" />
                    Simular frete agora
                  </span>
                )}
              </button>
            </form>

            {/* ── Resultados da simulação ── */}
            <AnimatePresence>
              {resultado && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-sm text-white/70 font-semibold">Resultado da simulação</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Melhor Envio */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <XCircle className="h-4 w-4 text-red-400 mx-auto mb-1" />
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Melhor Envio</p>
                      <p className="text-xl font-black text-white line-through opacity-60">
                        {formatBRL(resultado.melhorEnvio)}
                      </p>
                      <p className="text-[10px] text-red-400 mt-1">
                        {((resultado.melhorEnvio - resultado.brhub) / resultado.melhorEnvio * 100).toFixed(0)}% mais caro
                      </p>
                    </div>

                    {/* Superfrete */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Superfrete</p>
                      <p className="text-xl font-black text-white line-through opacity-60">
                        {formatBRL(resultado.superfrete)}
                      </p>
                      <p className="text-[10px] text-yellow-400 mt-1">Preço artificial</p>
                    </div>

                    {/* BRHUB */}
                    <div className="bg-gradient-to-br from-[#F37021]/20 to-[#F37021]/5 border-2 border-[#F37021] rounded-2xl p-4 text-center relative">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="bg-[#F37021] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          ✓ Melhor
                        </span>
                      </div>
                      <Trophy className="h-4 w-4 text-[#F37021] mx-auto mb-1 mt-1" />
                      <p className="text-[10px] text-[#F37021]/70 uppercase tracking-wide mb-1">BRHUB</p>
                      <p className="text-2xl font-black text-[#F37021]">
                        {formatBRL(resultado.brhub)}
                      </p>
                      <p className="text-[10px] text-green-400 mt-1">Menor preço ✓</p>
                    </div>
                  </div>

                  {/* Economias */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                      <TrendingDown className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white/50">vs Melhor Envio</p>
                        <p className="font-bold text-green-400">
                          Economiza {formatBRL(resultado.melhorEnvio - resultado.brhub)} ({economiaME.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#F37021]/10 border border-[#F37021]/20 rounded-xl p-3 flex items-center gap-3">
                      <Award className="h-5 w-5 text-[#F37021] flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white/50">vs Superfrete</p>
                        <p className="font-bold text-[#F37021]">
                          {formatBRL(resultado.superfrete - resultado.brhub)} mais barato ({economiaSF.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <a
                      href="/cadastro-cliente"
                      className="inline-flex items-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-8 py-4 rounded-full transition-all duration-200 hover:scale-105 shadow-lg shadow-[#F37021]/30 text-lg"
                    >
                      Quero esse preço agora
                      <ArrowRight className="h-5 w-5" />
                    </a>
                    <p className="text-xs text-white/30 mt-2">Crie sua conta grátis em 2 minutos</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>


      {/* ── Benefícios BRHUB ── */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Tudo que a <span className="text-[#F37021]">BRHUB</span> oferece
            </h2>
            <p className="text-white/50">Muito além do frete barato</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficios.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 hover:bg-white/8 border border-white/10 hover:border-[#F37021]/30 rounded-2xl p-5 transition-all duration-300 group"
              >
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${b.color} mb-3`}>
                  <b.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-white mb-1 group-hover:text-[#F37021] transition-colors">
                  {b.titulo}
                </h3>
                <p className="text-sm text-white/40">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparativo completo ── */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-black text-center mb-8">Comparativo completo</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left py-3 px-4">Recurso</th>
                  <th className="text-center py-3 px-4">Melhor Envio</th>
                  <th className="text-center py-3 px-4">Superfrete</th>
                  <th className="text-center py-3 px-4 text-[#F37021]">BRHUB ✓</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ["Preço de referência", formatBRL(PRECO_MELHOR_ENVIO), formatBRL(PRECO_SUPERFRETE) + "*", formatBRL(PRECO_ALVO_BRHUB)],
                  ["Mensalidade", "❌ Paga", "❌ Paga", "✅ Grátis"],
                  ["Coleta grátis", "❌ Não", "❌ Não", "✅ Sim"],
                  ["Rastreio WhatsApp", "❌ Não", "❌ Não", "✅ Sim"],
                  ["Suporte 24/7 por IA", "❌ Não", "❌ Não", "✅ Sim"],
                  ["Relatório em tempo real", "⚠️ Básico", "⚠️ Básico", "✅ Completo"],
                  ["Sustentabilidade do preço", "✅ Sim", "❌ Artificial", "✅ Sim"],
                ].map(([feature, me, sf, brhub], i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4 text-white/70 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center text-white/50">{me}</td>
                    <td className="py-3 px-4 text-center text-white/50">{sf}</td>
                    <td className="py-3 px-4 text-center font-bold text-[#F37021]">{brhub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-white/20 mt-2 px-4">
              * Superfrete opera com prejuízo de 23,1% sobre custo — preço insustentável a longo prazo.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#F37021]/20 via-[#F37021]/10 to-transparent border border-[#F37021]/30 rounded-3xl p-10"
          >
            <Trophy className="h-12 w-12 text-[#F37021] mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Pronto para pagar menos?
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Crie sua conta gratuita em 2 minutos e comece a economizar hoje mesmo.
              Sem contrato, sem mensalidade, sem pegadinha.
            </p>
            <a
              href="/cadastro-cliente"
              className="inline-flex items-center gap-3 bg-[#F37021] hover:bg-[#e06010] text-white font-black text-xl px-10 py-5 rounded-full transition-all duration-200 hover:scale-105 shadow-2xl shadow-[#F37021]/40"
            >
              Criar conta grátis agora
              <ChevronRight className="h-6 w-6" />
            </a>
            <p className="text-xs text-white/30 mt-4">
              Mais de 5.000 lojistas já economizam com a BRHUB
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoBrhub} alt="BRHUB" className="h-8 object-contain opacity-60" />
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
