import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, Truck, MessageCircle, Shield, Clock, Package, Star, Zap, BarChart3, Users, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import logoBrhub from "../../assets/logo-brhub-new.png";
import logoSuperfrete from "../../assets/logo-superfrete.png";
import logoMelhorEnvio from "../../assets/logo-melhorenvio.png";
import logoSedex from "../../assets/logo-sedex.png";
import logoPac from "../../assets/logo-pac.png";

// ── Constantes ───────────────────────────────────────────────────────────────
const DESCONTO_BRHUB = 0.29;
const MARKUP_SUPERFRETE = 1.06;
const MARKUP_MELHOR_ENVIO = 1.689;

interface OpcaoServico {
  servico: string;
  prazo: number;
  precoTabela: number;
  brhub: number;
  superfrete: number;
  melhorEnvio: number;
}

function formatBRL(v: number | undefined | null) {
  if (v == null || isNaN(v)) return "R$ --";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const beneficios = [
  { icon: TrendingDown, titulo: "Fretes até 80% mais baratos", desc: "Economize em todos os envios sem surpresas." },
  { icon: Truck, titulo: "Coleta grátis na sua loja", desc: "Buscamos suas encomendas sem custo extra e sem volume mínimo." },
  { icon: MessageCircle, titulo: "Rastreio automático via WhatsApp", desc: "O destinatário recebe atualizações em tempo real automaticamente." },
  { icon: Shield, titulo: "Sem contrato nem multas", desc: "Use quando quiser. Cancele quando quiser. Sem letras miúdas." },
  { icon: Clock, titulo: "Suporte IA 24/7", desc: "Resolva qualquer problema a qualquer hora, sem fila de atendimento." },
  { icon: Package, titulo: "Emissão em massa", desc: "Importe planilhas e emita centenas de etiquetas em segundos." },
  { icon: Star, titulo: "Integração com lojas virtuais", desc: "Shopify, Nuvemshop e muito mais. Pedidos importados automaticamente." },
  { icon: Zap, titulo: "Pagamento pós-uso", desc: "Pague só pelo que enviar. Sem mensalidade ou mínimo de envios." },
  { icon: BarChart3, titulo: "Relatórios detalhados", desc: "Acompanhe gastos, prazos e performance de cada transportadora." },
  { icon: CheckCircle, titulo: "Seguro automático incluso", desc: "Proteção para suas encomendas sem custo adicional." },
  { icon: Users, titulo: "Multi-usuário", desc: "Adicione sua equipe e controle acessos por perfil." },
  { icon: MessageCircle, titulo: "Notificação de atraso proativa", desc: "Alertamos seu cliente antes mesmo de reclamar." },
];

const stats = [
  { num: "+20.000", label: "Pacotes enviados", icon: Package },
  { num: "até 80%", label: "de economia média", icon: TrendingDown },
  { num: "24/7", label: "Suporte disponível", icon: Clock },
];

const comparativo = [
  { feature: "Coleta gratuita", superfrete: false, melhorEnvio: false, brhub: true },
  { feature: "Rastreio via WhatsApp", superfrete: false, melhorEnvio: false, brhub: true },
  { feature: "Suporte IA 24/7", superfrete: false, melhorEnvio: false, brhub: true },
  { feature: "Sem contrato", superfrete: true, melhorEnvio: true, brhub: true },
  { feature: "Integração Shopify / Nuvemshop", superfrete: true, melhorEnvio: true, brhub: true },
  { feature: "Emissão em massa (planilha)", superfrete: true, melhorEnvio: true, brhub: true },
  { feature: "Notificação proativa de atraso", superfrete: false, melhorEnvio: false, brhub: true },
  { feature: "Multi-usuário", superfrete: false, melhorEnvio: true, brhub: true },
];

interface ConectaOportunidadeProps {
  referralCode?: string;
}

export const ConectaOportunidade = ({ referralCode }: ConectaOportunidadeProps = {}) => {
  const [searchParams] = useSearchParams();
  const effectiveCode = referralCode || searchParams.get('ref') || undefined;
  const cadastroUrl = effectiveCode
    ? `/cadastro-cliente?ref=${effectiveCode}`
    : '/cadastro-cliente';

  const [cepOrigem, setCepOrigem] = useState("");
  const [cepDestino, setCepDestino] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [largura, setLargura] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ opcoes: OpcaoServico[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showAllBeneficios, setShowAllBeneficios] = useState(false);

  const handleSimular = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    setLoading(true);

    const normCep = (c: string) => c.replace(/\D/g, "").padStart(8, "0");
    const cepO = normCep(cepOrigem);
    const cepD = normCep(cepDestino);

    try {
      const { data, error } = await supabase.functions.invoke("calcular-frete-publico", {
        body: {
          cepOrigem: cepO,
          cepDestino: cepD,
          peso: Number(peso),
          altura: Number(altura),
          largura: Number(largura),
          comprimento: Number(comprimento),
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao calcular");

      const opcoesCalculadas: OpcaoServico[] = (data.opcoes || [])
        .filter((o: any) => {
          const s = (o.servico || "").toUpperCase();
          return (s === "PAC" || s === "SEDEX") && !s.includes("HOJE") && !s.includes("12") && !s.includes("10");
        })
        .map((o: any) => {
          const precoTabela = Number(o.preco || o.valor || 0);
          const brhub = precoTabela * (1 - DESCONTO_BRHUB);
          return {
            servico: (o.servico || "").toUpperCase(),
            prazo: Number(o.prazo || 0),
            precoTabela,
            brhub,
            superfrete: brhub * MARKUP_SUPERFRETE,
            melhorEnvio: brhub * MARKUP_MELHOR_ENVIO,
          };
        });

      if (!opcoesCalculadas.length) {
        setErro("Nenhuma opção de PAC ou SEDEX encontrada. Tente outros CEPs.");
        return;
      }
      setResultado({ opcoes: opcoesCalculadas });
    } catch (err: any) {
      setErro(err.message || "Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const visibleBeneficios = showAllBeneficios ? beneficios : beneficios.slice(0, 6);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoBrhub} alt="BRHUB Envios" className="h-8 object-contain" />
          <a
            href={cadastroUrl}
            className="bg-[#F37021] hover:bg-[#e06010] text-white text-sm font-bold px-4 py-2 rounded-full transition-all duration-200 shadow-md shadow-orange-200 whitespace-nowrap">
            Criar conta grátis →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-10 pb-0 px-4 overflow-hidden bg-[#121212]">
        {/* Decoração */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F37021]/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-20 w-48 h-48 bg-[#F37021]/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8">

            <span className="inline-block bg-[#F37021]/15 text-[#F37021] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest mb-4 border border-[#F37021]/25">
              Plataforma de fretes para lojistas
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
              Envie mais barato.<br />
              <span className="text-[#F37021]">Muito mais barato.</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-6 px-2">
              Enquanto outras plataformas só intermediam, a BRHUB busca suas encomendas na sua loja — sem custo extra — e ainda entrega mais barato.
            </p>

            {/* Stats — 3 em linha no mobile */}
            <div className="flex items-stretch gap-2 justify-center mb-8">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex-1 max-w-[110px]">
                  <s.icon className="w-4 h-4 text-[#F37021]" />
                  <p className="text-white font-black text-base leading-none">{s.num}</p>
                  <p className="text-gray-500 text-[9px] text-center leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Simulador ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 mb-0">

            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 text-center">
              ⚡ Simule agora — veja o quanto você economiza
            </p>

            <form onSubmit={handleSimular} className="space-y-3">
              {/* CEPs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">CEP Origem</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={cepOrigem}
                    onChange={e => setCepOrigem(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">CEP Destino</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={cepDestino}
                    onChange={e => setCepDestino(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                  />
                </div>
              </div>

              {/* Dimensões — 2 colunas no mobile */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Peso e dimensões (cm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Peso (g)"
                      min={1}
                      value={peso}
                      onChange={e => setPeso(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Comprimento"
                      min={1}
                      value={comprimento}
                      onChange={e => setComprimento(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Largura"
                      min={1}
                      value={largura}
                      onChange={e => setLargura(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Altura"
                      min={1}
                      value={altura}
                      onChange={e => setAltura(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 focus:border-[#F37021]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F37021] hover:bg-[#e06010] disabled:opacity-60 text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-200 text-base">
                {loading ? "Calculando..." : "⚡ Simular frete agora"}
              </button>
            </form>

            {/* Erro */}
            {erro && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {erro}
              </div>
            )}

            {/* ── Resultado ── */}
            <AnimatePresence>
              {resultado && (
                <motion.div
                  key="resultado"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4">

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">
                    🏆 Resultado da simulação
                  </p>

                  <div className="space-y-4">
                    {resultado.opcoes.map((opcao) => {
                      const isSedex = opcao.servico === "SEDEX";
                      const economiaSF = ((opcao.superfrete - opcao.brhub) / opcao.superfrete * 100).toFixed(0);
                      const economiaME = ((opcao.melhorEnvio - opcao.brhub) / opcao.melhorEnvio * 100).toFixed(0);

                      return (
                        <div
                          key={opcao.servico}
                          className={`rounded-2xl overflow-hidden border-2 ${isSedex ? 'border-orange-400' : 'border-gray-200'}`}>

                          {isSedex && (
                            <div className="bg-[#F37021] px-4 py-1.5 text-center">
                              <span className="text-white text-[10px] font-black uppercase tracking-widest">🏆 Melhor opção</span>
                            </div>
                          )}

                          {/* Header serviço */}
                          <div className={`flex items-center gap-3 px-4 py-3 ${isSedex ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <img src={isSedex ? logoSedex : logoPac} alt={opcao.servico} className="h-7 object-contain" />
                            <div>
                              <span className="text-xs font-bold text-gray-700">{opcao.servico}</span>
                              <p className="text-[10px] text-gray-400">{opcao.prazo} {opcao.prazo === 1 ? 'dia útil' : 'dias úteis'}</p>
                            </div>
                          </div>

                          {/* Preço BRHUB destaque */}
                          <div className={`px-4 py-4 border-b ${isSedex ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Seu preço com BRHUB</p>
                            <div className="flex items-end gap-2">
                              <span className="text-3xl font-black text-[#121212]">{formatBRL(opcao.brhub)}</span>
                              {isSedex && (
                                <span className="text-[10px] text-[#F37021] font-bold bg-orange-100 px-2 py-0.5 rounded-full mb-1">MELHOR PREÇO</span>
                              )}
                            </div>
                          </div>

                          {/* Concorrentes */}
                          <div className="bg-white px-4 py-3 space-y-2.5">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Você pagaria em outras plataformas</p>

                            {/* Superfrete */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img src={logoSuperfrete} alt="Superfrete" className="h-4 object-contain opacity-50 grayscale" />
                              </div>
                              <div className="text-right">
                                <span className="text-sm line-through text-gray-400">{formatBRL(opcao.superfrete)}</span>
                                <span className="ml-2 text-[10px] bg-red-100 text-red-500 font-bold px-1.5 py-0.5 rounded-full">+{economiaSF}% mais caro</span>
                              </div>
                            </div>

                            {/* Melhor Envio */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img src={logoMelhorEnvio} alt="Melhor Envio" className="h-4 object-contain opacity-50 grayscale" />
                              </div>
                              <div className="text-right">
                                <span className="text-sm line-through text-gray-400">{formatBRL(opcao.melhorEnvio)}</span>
                                <span className="ml-2 text-[10px] bg-red-100 text-red-500 font-bold px-1.5 py-0.5 rounded-full">+{economiaME}% mais caro</span>
                              </div>
                            </div>
                          </div>

                          {/* CTA */}
                          <div className={`px-4 py-4 ${isSedex ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <a
                              href={cadastroUrl}
                              className="flex items-center justify-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-orange-200 text-sm w-full">
                              Quero esse preço agora →
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Transição suave */}
        <div className="h-12 bg-gradient-to-b from-[#121212] to-white mt-0" />
      </section>

      {/* ── Avaliações Google ── */}
      <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">O que dizem nossos clientes</p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xl font-black text-gray-900">4.9</span>
              <span className="text-sm text-gray-400">· 78 avaliações</span>
            </div>
          </div>

          {/* Depoimentos — scroll horizontal no mobile */}
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory">
            {[
              { nome: "Kaká Oliveira", avatar: "KO", tempo: "há 2 semanas", texto: "Melhor plataforma de envios que já usei! Preços muito abaixo do mercado e o suporte é incrível." },
              { nome: "Ricardo Mendes", avatar: "RM", tempo: "há 1 mês", texto: "Economizei quase 70% nos fretes comparado ao que pagava antes. Nunca mais volto para outras plataformas." },
              { nome: "Fernanda Costa", avatar: "FC", tempo: "há 3 semanas", texto: "A coleta grátis é incrível! Não preciso mais ir ao correio. Recomendo para qualquer lojista!" },
              { nome: "Carlos Silva", avatar: "CS", tempo: "há 2 meses", texto: "Rastreio no WhatsApp automático mudou minha vida. Meus clientes amam." },
            ].map((d, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 min-w-[260px] max-w-[280px] snap-start flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {d.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{d.nome}</p>
                    <p className="text-[10px] text-gray-400">{d.tempo}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{d.texto}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <a
              href="https://www.google.com/maps/search/brhub+envios"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.7 19.4-20 0-1.4-.1-2.7-.4-4z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.3 0-9.5-3.4-11.3-8.1l-6.6 4.7C9.5 39.4 16.3 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 36.2 44 30.6 44 24c0-1.4-.1-2.7-.4-4z" />
              </svg>
              Ver todas as 78 avaliações no Google
            </a>
          </div>
        </div>
      </section>

      {/* ── Benefícios ── */}
      <section className="py-10 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tudo incluso, sem custo extra</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#121212]">
              Por que a BRHUB é<br /><span className="text-[#F37021]">diferente de tudo?</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleBeneficios.map((b, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 rounded-xl bg-[#F37021]/10 flex items-center justify-center">
                  <b.icon className="w-4 h-4 text-[#F37021]" />
                </div>
                <p className="font-bold text-gray-900 text-xs leading-tight">{b.titulo}</p>
                <p className="text-[10px] text-gray-400 leading-snug">{b.desc}</p>
              </div>
            ))}
          </div>

          {beneficios.length > 6 && (
            <button
              onClick={() => setShowAllBeneficios(v => !v)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors py-2"
            >
              {showAllBeneficios ? (
                <><ChevronUp className="w-4 h-4" /> Ver menos</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Ver todos os {beneficios.length} benefícios</>
              )}
            </button>
          )}
        </div>
      </section>

      {/* ── Comparativo ── */}
      <section className="py-10 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comparativo honesto</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#121212]">
              BRHUB vs <span className="text-[#F37021]">concorrentes</span>
            </h2>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 text-center bg-[#121212]">
              <div className="py-3 px-2 border-r border-white/10" />
              <div className="py-3 px-1 border-r border-white/10">
                <img src={logoSuperfrete} alt="Superfrete" className="h-4 object-contain mx-auto opacity-60 grayscale brightness-200" />
              </div>
              <div className="py-3 px-1 border-r border-white/10">
                <img src={logoMelhorEnvio} alt="Melhor Envio" className="h-4 object-contain mx-auto opacity-60 grayscale brightness-200" />
              </div>
              <div className="py-3 px-1 bg-[#F37021]/20">
                <img src={logoBrhub} alt="BRHUB" className="h-4 object-contain mx-auto" />
              </div>
            </div>

            {/* Rows */}
            {comparativo.map((row, i) => (
              <div key={i} className={`grid grid-cols-4 text-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-t border-gray-100`}>
                <div className="py-3 px-2 text-left border-r border-gray-100">
                  <p className="text-[10px] font-medium text-gray-600 leading-tight">{row.feature}</p>
                </div>
                {[row.superfrete, row.melhorEnvio, row.brhub].map((val, j) => (
                  <div key={j} className={`py-3 flex items-center justify-center ${j === 2 ? 'bg-orange-50/60' : ''} ${j < 2 ? 'border-r border-gray-100' : ''}`}>
                    {val ? (
                      <span className="text-green-500 text-sm font-bold">✓</span>
                    ) : (
                      <span className="text-gray-300 text-sm font-bold">✗</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-3">
            Dados baseados nos sites oficiais dos concorrentes. Verificado em fevereiro/2026.
          </p>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-10 px-4 bg-[#121212]">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Pronto para enviar mais barato?
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Junte-se a milhares de lojistas que já economizam com a BRHUB.
          </p>
          <a
            href={cadastroUrl}
            className="inline-flex items-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-8 py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-orange-900/40 text-base">
            Criar conta grátis →
          </a>
          <p className="text-gray-600 text-[10px] mt-3">Sem cartão de crédito · Sem mensalidade · Cancele quando quiser</p>
        </div>
      </section>
    </div>
  );
};

export default ConectaOportunidade;
