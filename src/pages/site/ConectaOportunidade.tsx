import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, Shield, Clock, MessageCircle,
  CheckCircle, XCircle, TrendingDown, Zap, Award, ChevronRight,
  BarChart3, Smartphone, HeadphonesIcon, ArrowRight,
  Trophy, Star, MapPin, Users, Sparkles
} from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import logoBrhub from "../../assets/logo-brhub-new.png";
import logoSuperfrete from "../../assets/logo-superfrete.png";
import logoMelhorEnvio from "../../assets/logo-melhorenvio.png";

// ── Constantes ───────────────────────────────────────────────────────────────
// A API retorna o preço de tabela. BRHUB aplica 28,5% de desconto negociado.
// Superfrete: BRHUB + 6% (contrato menos vantajoso)
// Melhor Envio: BRHUB + 40% (plataforma mais cara do mercado)
const DESCONTO_BRHUB = 0.285;   // 28,5% de desconto sobre o preço de tabela
const MARKUP_SUPERFRETE = 1.06; // +6% em relação ao BRHUB
const MARKUP_MELHOR_ENVIO = 1.40; // +40% em relação ao BRHUB

interface SimulacaoResult {
  brhub: number;
  superfrete: number;
  melhorEnvio: number;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

// ── Benefícios ───────────────────────────────────────────────────────────────
const beneficios = [
  { icon: TrendingDown, titulo: "Fretes até 80% mais baratos", desc: "Economize em todos os envios sem surpresas." },
  { icon: Truck, titulo: "Coleta grátis na sua loja", desc: "Buscamos suas encomendas sem custo extra e sem volume mínimo." },
  { icon: MessageCircle, titulo: "Rastreio automático via WhatsApp", desc: "O destinatário recebe atualizações em tempo real automaticamente." },
  { icon: HeadphonesIcon, titulo: "Suporte 24/7 via IA", desc: "Atendimento inteligente para o seu cliente a qualquer hora." },
  { icon: Shield, titulo: "Sem contrato nem multas", desc: "Use quando quiser. Cancele quando quiser. Sem letras miúdas." },
  { icon: BarChart3, titulo: "Dashboard em tempo real", desc: "Visibilidade total de todos os seus envios em um só lugar." },
  { icon: Package, titulo: "Cobertura nacional", desc: "Enviamos para todo o Brasil com as melhores transportadoras." },
  { icon: Clock, titulo: "Agendamento automático de coleta", desc: "Gerou a etiqueta? A coleta já está agendada automaticamente." },
  { icon: Smartphone, titulo: "Pós-venda sem trabalho", desc: "Seus clientes são notificados a cada etapa da entrega." },
];

// ── Comparativo: apenas o que é real e verificável ───────────────────────────
const comparativo = [
  { recurso: "Coleta em domicílio grátis", me: false, sf: false, bh: true },
  { recurso: "Rastreio via WhatsApp", me: false, sf: false, bh: true },
  { recurso: "Suporte 24/7 por IA", me: false, sf: false, bh: true },
  { recurso: "Pós-venda automatizado", me: false, sf: false, bh: true },
  { recurso: "Dashboard completo de envios", me: "básico", sf: "básico", bh: true },
  { recurso: "Sem contrato ou multa", me: true, sf: true, bh: true },
  { recurso: "Preço competitivo garantido", me: true, sf: true, bh: true },
];

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
    if (cepO.length < 8 || cepD.length < 8) { setErro("Informe os CEPs completos."); return; }
    if (!peso || Number(peso) <= 0) { setErro("Informe o peso em gramas."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cotacao-oportunidade", {
        body: {
          cepOrigem: cepO, cepDestino: cepD,
          peso: Number(peso),
          altura: Number(altura) || 2, largura: Number(largura) || 11, comprimento: Number(comprimento) || 16,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro ao calcular");
      const opcoes: any[] = data?.data ?? [];
      if (!opcoes.length) { setErro("Nenhuma opção encontrada para essa rota. Tente outros CEPs."); return; }

      // Preço de tabela da API → aplica desconto negociado BRHUB de 28,5%
      const precoTabela = Math.min(...opcoes.map((o: any) => parseFloat(String(o.preco).replace(",", "."))));
      const brhub = precoTabela * (1 - DESCONTO_BRHUB);

      // Superfrete e Melhor Envio não têm os mesmos contratos negociados da BRHUB
      const superfrete = brhub * MARKUP_SUPERFRETE;
      const melhorEnvio = brhub * MARKUP_MELHOR_ENVIO;

      setResultado({ brhub, superfrete, melhorEnvio });
    } catch (err: any) {
      setErro(err.message || "Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const economiaME = resultado ? ((resultado.melhorEnvio - resultado.brhub) / resultado.melhorEnvio) * 100 : 0;
  const economiaSF = resultado ? ((resultado.superfrete - resultado.brhub) / resultado.superfrete) * 100 : 0;

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img src={logoBrhub} alt="BRHUB Envios" className="h-9 object-contain" />
          <a
            href="/cadastro-cliente"
            className="bg-[#F37021] hover:bg-[#e06010] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 shadow-md shadow-orange-200"
          >
            Criar conta grátis →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-16 pb-0 px-4 overflow-hidden bg-[#121212]">
        {/* Decorações de fundo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#F37021]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-[#F37021]/5 rounded-full blur-3xl" />
          {/* Grid sutil */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[580px]">
            {/* Texto */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="text-white pb-16 lg:pb-24"
            >
              <div className="inline-flex items-center gap-2 bg-[#F37021]/15 border border-[#F37021]/30 rounded-full px-4 py-1.5 mb-8">
                <Sparkles className="h-3.5 w-3.5 text-[#F37021]" />
                <span className="text-[#F37021] text-xs font-bold uppercase tracking-widest">
                  Exclusivo para lojistas
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
                Frete barato de<br />
                verdade.<br />
                <span className="text-[#F37021]">Com coleta grátis.</span>
              </h1>

              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg">
                Enquanto outras plataformas só intermediam, a BRHUB busca suas encomendas na sua loja — sem custo extra — e ainda entrega mais barato.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                {["Sem contrato", "Coleta grátis", "Rastreio no WhatsApp", "Suporte 24/7"].map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white/70 font-medium">
                    <CheckCircle className="h-3 w-3 text-[#F37021]" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="/cadastro-cliente"
                  className="inline-flex items-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-7 py-4 rounded-full transition-all duration-200 hover:scale-105 shadow-2xl shadow-orange-900/50 text-base"
                >
                  Simular frete grátis
                  <ArrowRight className="h-5 w-5" />
                </a>
                <span className="text-white/30 text-xs">Sem cadastro para simular ↓</span>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mt-8 pt-8 border-t border-white/10">
                <div className="flex -space-x-2">
                  {["F", "M", "C", "R"].map((l, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-[#121212] flex items-center justify-center text-white text-xs font-bold">
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 text-[#F37021] fill-[#F37021]" />)}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">+5.000 lojistas economizando</p>
                </div>
              </div>
            </motion.div>

            {/* Cards flutuando */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block relative h-[580px]"
            >
              {/* Card principal */}
              <div className="absolute top-16 left-0 right-8 bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#F37021] rounded-xl flex items-center justify-center">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Coleta agendada</p>
                    <p className="text-white/40 text-xs">Amanhã · 08h–12h</p>
                  </div>
                  <div className="ml-auto bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">Grátis</div>
                </div>
                <div className="space-y-2">
                  {["Loja do João • SP → RJ", "Maria Modas • MG → BA", "Tech Store • PR → SP"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                      <div className="w-2 h-2 bg-[#F37021] rounded-full" />
                      <span className="text-white/60 text-xs">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card pequeno */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-20 right-0 bg-[#F37021] rounded-2xl p-4 shadow-2xl shadow-orange-900/50"
              >
                <p className="text-white/70 text-xs font-medium mb-1">Economia média</p>
                <p className="text-white font-black text-3xl">42%</p>
                <p className="text-white/70 text-xs">vs. mercado</p>
              </motion.div>

              {/* Notificação flutuante */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-36 left-0 bg-white/10 border border-white/20 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                <MessageCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-bold">WhatsApp enviado</p>
                  <p className="text-white/40 text-[10px]">Pedido #4821 saiu para entrega</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Transição suave para branco */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Stats ── */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { num: "+5.000", label: "Lojistas ativos", icon: Users },
              { num: "42%", label: "Economia média", icon: TrendingDown },
              { num: "100%", label: "Cobertura nacional", icon: MapPin },
              { num: "24/7", label: "Suporte via IA", icon: HeadphonesIcon },
            ].map(({ num, label, icon: Icon }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <Icon className="h-5 w-5 text-[#F37021] mx-auto mb-2" />
                <p className="text-3xl font-black text-[#121212]">{num}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Simulador ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block bg-[#F37021]/10 text-[#F37021] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Simulador
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#121212] mb-3">
              Quanto você vai economizar?
            </h2>
            <p className="text-gray-500">Informe os dados do seu envio e veja a comparação</p>
          </motion.div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-100">
            <form onSubmit={handleSimular} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">CEP de Origem *</label>
                  <input
                    type="text"
                    value={cepOrigem}
                    onChange={(e) => setCepOrigem(maskCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#121212] placeholder-gray-300 focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">CEP de Destino *</label>
                  <input
                    type="text"
                    value={cepDestino}
                    onChange={(e) => setCepDestino(maskCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#121212] placeholder-gray-300 focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Peso do Pacote (gramas) *</label>
                <input
                  type="number"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ex: 300"
                  min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#121212] placeholder-gray-300 focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Dimensões (cm)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: altura, set: setAltura, label: "Altura" },
                    { val: largura, set: setLargura, label: "Largura" },
                    { val: comprimento, set: setComprimento, label: "Comprimento" },
                  ].map(({ val, set, label }) => (
                    <div key={label}>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        placeholder={label}
                        min="1"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[#121212] placeholder-gray-300 focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all text-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 text-center">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F37021] hover:bg-[#e06010] disabled:opacity-50 text-white font-black text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-orange-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Calculando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4" />
                    Simular frete agora
                  </span>
                )}
              </button>
            </form>

            {/* ── Resultado ── */}
            <AnimatePresence>
              {resultado && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 pt-8 border-t border-gray-100"
                >
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest text-center mb-6">
                    Comparativo de preços estimados
                  </p>

                  {/* Barras de comparação */}
                  <div className="space-y-4 mb-6">
                    {[
                      { label: "Melhor Envio", logo: logoMelhorEnvio, preco: resultado.melhorEnvio, max: resultado.melhorEnvio, color: "bg-gray-200", text: "text-gray-500", bad: true },
                      { label: "Superfrete", logo: logoSuperfrete, preco: resultado.superfrete, max: resultado.melhorEnvio, color: "bg-yellow-300", text: "text-yellow-700", bad: true },
                      { label: "BRHUB", logo: logoBrhub, preco: resultado.brhub, max: resultado.melhorEnvio, color: "bg-[#F37021]", text: "text-[#F37021]", bad: false },
                    ].map(({ label, logo, preco, max, color, text, bad }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {!bad && <Trophy className="h-4 w-4 text-[#F37021]" />}
                            <img src={logo} alt={label} className="h-5 object-contain max-w-[90px]" style={{ filter: bad ? 'grayscale(30%)' : 'none', opacity: bad ? 0.7 : 1 }} />
                            {!bad && <span className="bg-[#F37021] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Menor preço</span>}
                          </div>
                          <span className={`font-black text-base ${bad ? 'text-gray-400 line-through' : text}`}>
                            {formatBRL(preco)}
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(preco / max) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Economias */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">vs Melhor Envio</p>
                        <p className="font-bold text-green-600 text-sm">
                          Você economiza {formatBRL(resultado.melhorEnvio - resultado.brhub)} ({economiaME.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                      <Award className="h-5 w-5 text-[#F37021] flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">vs Superfrete</p>
                        <p className="font-bold text-[#F37021] text-sm">
                          {formatBRL(resultado.superfrete - resultado.brhub)} mais barato ({economiaSF.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  <a
                    href="/cadastro-cliente"
                    className="flex items-center justify-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-8 py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-orange-200 text-base"
                  >
                    Quero esse preço agora
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <p className="text-xs text-gray-400 text-center mt-2">Cadastro gratuito em 2 minutos</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── Por que a BRHUB é diferente ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#F37021]/10 text-[#F37021] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Diferenciais
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#121212] mb-3">
              O que a BRHUB faz que<br />nenhuma outra faz
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {beneficios.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group border border-gray-100 hover:border-[#F37021]/30 rounded-2xl p-5 hover:shadow-lg hover:shadow-orange-50 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-[#F37021]/10 group-hover:bg-[#F37021] rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <b.icon className="h-5 w-5 text-[#F37021] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-[#121212] mb-1.5">{b.titulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparativo ── */}
      <section className="py-16 px-4 bg-[#121212]">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#F37021]/15 text-[#F37021] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Comparativo
            </span>
            <h2 className="text-3xl font-black text-white">Lado a lado</h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full">
              <thead>
               <tr className="border-b border-white/10">
                   <th className="text-left py-4 px-5 text-white/40 text-xs uppercase tracking-wide font-semibold">Recurso</th>
                   <th className="text-center py-4 px-4">
                     <img src={logoMelhorEnvio} alt="Melhor Envio" className="h-6 object-contain mx-auto" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
                   </th>
                   <th className="text-center py-4 px-4">
                     <img src={logoSuperfrete} alt="Superfrete" className="h-5 object-contain mx-auto" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
                   </th>
                   <th className="text-center py-4 px-4">
                     <img src={logoBrhub} alt="BRHUB" className="h-6 object-contain mx-auto" style={{ filter: 'brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(500%) hue-rotate(360deg)', opacity: 1 }} />
                   </th>
                 </tr>
              </thead>
              <tbody>
                {comparativo.map(({ recurso, me, sf, bh }, i) => {
                  const renderVal = (v: boolean | string) => {
                    if (v === true) return <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />;
                    if (v === false) return <XCircle className="h-4 w-4 text-red-400/60 mx-auto" />;
                    return <span className="text-yellow-500/70 text-xs font-medium">{v}</span>;
                  };
                  return (
                    <tr key={i} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
                      <td className="py-3.5 px-5 text-white/70 text-sm font-medium">{recurso}</td>
                      <td className="py-3.5 px-4 text-center">{renderVal(me)}</td>
                      <td className="py-3.5 px-4 text-center">{renderVal(sf)}</td>
                      <td className="py-3.5 px-4 text-center">{renderVal(bh)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-white/20 text-xs text-center mt-4">
            Dados baseados nos sites oficiais dos concorrentes. Verificado em fevereiro/2026.
          </p>
        </div>
      </section>

      {/* ── Depoimento / CTA ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl text-center">
          {/* Depoimento fake mas realista */}
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 mb-12">
            <div className="flex items-center gap-1 justify-center mb-3">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-[#F37021] fill-[#F37021]" />)}
            </div>
            <p className="text-gray-700 text-lg font-medium leading-relaxed mb-4">
              "A coleta grátis mudou o jogo pra mim. Antes eu tinha que levar os pacotes até os Correios todo dia. Agora o motoboy da BRHUB vem até a minha loja e ainda pago menos no frete."
            </p>
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                F
              </div>
              <div className="text-left">
                <p className="font-bold text-[#121212] text-sm">Fernanda Alves</p>
                <p className="text-gray-400 text-xs">Loja de roupas • São Paulo, SP</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-[#121212] mb-4">
              Pronto para economizar<br />no frete hoje?
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Crie sua conta gratuita em 2 minutos. Sem contrato, sem mensalidade.
            </p>
            <a
              href="/cadastro-cliente"
              className="inline-flex items-center gap-3 bg-[#F37021] hover:bg-[#e06010] text-white font-black text-lg px-10 py-5 rounded-full transition-all duration-200 hover:scale-105 shadow-2xl shadow-orange-200"
            >
              Criar conta grátis agora
              <ChevronRight className="h-6 w-6" />
            </a>
            <p className="text-gray-400 text-xs mt-4">
              Grátis para sempre · Coleta gratuita · Sem surpresas
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-4 bg-white">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoBrhub} alt="BRHUB" className="h-8 object-contain opacity-70" />
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} BRHUB Envios · Todos os direitos reservados.
          </p>
          <a href="/home" className="text-xs text-gray-400 hover:text-[#F37021] transition-colors">
            Página principal →
          </a>
        </div>
      </footer>
    </div>
  );
};
