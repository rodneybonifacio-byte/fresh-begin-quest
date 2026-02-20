import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, Truck, MessageCircle, Shield, Clock, Package, Star, Zap, BarChart3, Users, CheckCircle } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import logoBrhub from "../../assets/logo-brhub-new.png";
import logoSuperfrete from "../../assets/logo-superfrete.png";
import logoMelhorEnvio from "../../assets/logo-melhorenvio.png";
import logoSedex from "../../assets/logo-sedex.png";
import logoPac from "../../assets/logo-pac.png";

// ── Constantes ───────────────────────────────────────────────────────────────
// API (conta financeiro@brhubb.com.br) retorna preço base
// BRHUB = preço API - 29% | Superfrete = BRHUB × 1,06 | Melhor Envio = BRHUB × 1,689
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

// ── Benefícios ───────────────────────────────────────────────────────────────
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
  { icon: Truck, titulo: "Múltiplas transportadoras", desc: "Correios, Rodonaves e mais. Sempre o melhor preço para cada rota." },
  { icon: MessageCircle, titulo: "Notificação de atraso proativa", desc: "Alertamos seu cliente antes mesmo de reclamar." },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = [
  { num: "+20.000", label: "Pacotes enviados", icon: Package },
  { num: "até 80%", label: "de economia média", icon: TrendingDown },
  { num: "24/7", label: "Suporte disponível", icon: Clock },
];

export const ConectaOportunidade = () => {
  const [cepOrigem, setCepOrigem] = useState("");
  const [cepDestino, setCepDestino] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [largura, setLargura] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ opcoes: OpcaoServico[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleSimular = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    setLoading(true);

    const normCep = (c: string) => c.replace(/\D/g, "").padStart(8, "0");
    const cepO = normCep(cepOrigem);
    const cepD = normCep(cepDestino);

    if (cepO.length !== 8 || cepD.length !== 8) {
      setErro("CEP inválido. Digite 8 dígitos.");
      setLoading(false);
      return;
    }
    if (!peso || Number(peso) <= 0) {
      setErro("Informe o peso do pacote.");
      setLoading(false);
      return;
    }

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

      const SERVICOS_ACEITOS = ["PAC", "SEDEX"];
      const opcoesCalculadas: OpcaoServico[] = opcoes
        .filter((o: any) => {
          const nome: string = (o.nomeServico || o.servico || "").toUpperCase().trim();
          return SERVICOS_ACEITOS.includes(nome);
        })
        .map((o: any) => {
          const precoApi = parseFloat(String(o.preco).replace(",", "."));
          if (isNaN(precoApi) || precoApi <= 0) return null;
          const brhub = precoApi * (1 - DESCONTO_BRHUB);
          return {
            servico: (o.nomeServico || o.servico || "Serviço").toUpperCase().trim(),
            prazo: Number(o.prazo) || 0,
            precoTabela: precoApi,
            brhub,
            superfrete: brhub * MARKUP_SUPERFRETE,
            melhorEnvio: brhub * MARKUP_MELHOR_ENVIO,
          };
        })
        .filter(Boolean) as OpcaoServico[];

      opcoesCalculadas.sort((a) => (a.servico === "SEDEX" ? -1 : 1));

      if (!opcoesCalculadas.length) { setErro("Nenhuma opção de PAC ou SEDEX encontrada. Tente outros CEPs."); return; }

      setResultado({ opcoes: opcoesCalculadas });
    } catch (err: any) {
      setErro(err.message || "Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#F37021]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-[#F37021]/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block bg-[#F37021]/15 text-[#F37021] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-5 border border-[#F37021]/25">
              🚀 Plataforma de fretes para lojistas
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
              Envie mais barato.<br />
              <span className="text-[#F37021]">Muito mais barato.</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
              Enquanto outras plataformas só intermediam, a BRHUB busca suas encomendas na sua loja — sem custo extra — e ainda entrega mais barato.
            </p>

            <div className="flex items-center gap-4 justify-center flex-wrap mb-10">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <s.icon className="w-4 h-4 text-[#F37021]" />
                  <div className="text-left">
                    <p className="text-white font-black text-sm leading-none">{s.num}</p>
                    <p className="text-white/40 text-[10px]">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Simulador ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-0"
          >
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-5 text-center">
              🔢 Simule seu frete agora — grátis e sem cadastro
            </p>

            <form onSubmit={handleSimular} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">CEP Origem</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={cepOrigem}
                    onChange={e => setCepOrigem(e.target.value)}
                    maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">CEP Destino</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={cepDestino}
                    onChange={e => setCepDestino(e.target.value)}
                    maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Peso (g)</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={peso}
                    onChange={e => setPeso(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Altura (cm)</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={altura}
                    onChange={e => setAltura(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Largura (cm)</label>
                  <input
                    type="number"
                    placeholder="11"
                    value={largura}
                    onChange={e => setLargura(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Compr. (cm)</label>
                  <input
                    type="number"
                    placeholder="16"
                    value={comprimento}
                    onChange={e => setComprimento(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F37021] focus:ring-2 focus:ring-[#F37021]/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F37021] hover:bg-[#e06010] disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all duration-200 hover:scale-[1.01] shadow-lg shadow-orange-200 text-base"
              >
                {loading ? "Calculando..." : "🔍 Simular frete agora"}
              </button>
            </form>

            {erro && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">
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
                  exit={{ opacity: 0 }}
                  className="mt-6"
                >
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest text-center mb-5">
                    Seu preço com BRHUB vs concorrentes
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    {resultado.opcoes.map((opcao) => {
                      const isSedex = opcao.servico === "SEDEX";
                      const economiaSF = ((opcao.superfrete - opcao.brhub) / opcao.superfrete) * 100;
                      const economiaME = ((opcao.melhorEnvio - opcao.brhub) / opcao.melhorEnvio) * 100;
                      return (
                        <motion.div
                          key={opcao.servico}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: isSedex ? 0 : 0.12 }}
                          className={`relative rounded-2xl border-2 overflow-hidden ${isSedex ? 'border-[#F37021]' : 'border-gray-200'}`}
                        >
                          {isSedex && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#F37021] text-white text-[9px] font-black px-3 py-1 rounded-b-full uppercase tracking-wide whitespace-nowrap z-10">
                              ⚡ Mais rápido
                            </span>
                          )}

                          {/* Cabeçalho */}
                          <div className={`flex items-center justify-between px-4 pt-7 pb-3 ${isSedex ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                              <img src={isSedex ? logoSedex : logoPac} alt={opcao.servico} className="h-8 object-contain" />
                              <span className="text-xs text-gray-400">{opcao.prazo} {opcao.prazo === 1 ? 'dia útil' : 'dias úteis'}</span>
                            </div>
                            <img src={logoBrhub} alt="BRHUB" className="h-5 object-contain" />
                          </div>

                          {/* Preço BRHUB campeão */}
                          <div className={`px-4 py-4 ${isSedex ? 'bg-orange-50' : 'bg-gray-50'} border-b ${isSedex ? 'border-orange-200' : 'border-gray-200'}`}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Seu preço com BRHUB</p>
                            <div className="flex items-end gap-2">
                              <p className={`text-5xl font-black leading-none ${isSedex ? 'text-[#F37021]' : 'text-gray-800'}`}>
                                {formatBRL(opcao.brhub)}
                              </p>
                              <span className="mb-1 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                                🏆 MELHOR PREÇO
                              </span>
                            </div>
                          </div>

                          {/* Concorrentes com valores grandes */}
                          <div className="bg-white px-4 py-4 space-y-3">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Você pagaria em outras plataformas</p>

                            <div className="flex items-center justify-between gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                              <img src={logoSuperfrete} alt="Superfrete" className="h-4 object-contain max-w-[65px]" style={{ filter: 'grayscale(40%)', opacity: 0.7 }} />
                              <div className="text-right">
                                <p className="text-2xl font-black text-red-500 line-through decoration-red-400">{formatBRL(opcao.superfrete)}</p>
                                <p className="text-[10px] text-red-400 font-bold">+{economiaSF.toFixed(0)}% mais caro</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                              <img src={logoMelhorEnvio} alt="Melhor Envio" className="h-4 object-contain max-w-[75px]" style={{ filter: 'grayscale(40%)', opacity: 0.7 }} />
                              <div className="text-right">
                                <p className="text-2xl font-black text-red-500 line-through decoration-red-400">{formatBRL(opcao.melhorEnvio)}</p>
                                <p className="text-[10px] text-red-400 font-bold">+{economiaME.toFixed(0)}% mais caro</p>
                              </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl py-2.5 px-3 text-center">
                              <p className="text-xs font-black text-green-700">
                                💰 Economize até <span className="text-green-600 text-sm">{economiaME.toFixed(0)}%</span> vs concorrentes
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <a
                    href="/cadastro-cliente"
                    className="flex items-center justify-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-8 py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-orange-200 text-base"
                  >
                    Quero esse preço agora →
                  </a>
                  <p className="text-xs text-gray-400 text-center mt-2">Cadastro gratuito em 2 minutos</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Transição suave para branco */}
        <div className="h-16 bg-gradient-to-b from-[#121212] to-white mt-0" />
      </section>

      {/* ── Avaliações Google ── */}
      <section className="py-16 px-4 bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">O que dizem nossos clientes</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg className="w-8 h-8" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.7 19.4-20 0-1.4-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.3 0-9.5-3.4-11.3-8.1l-6.6 4.7C9.5 39.4 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 36.2 44 30.6 44 24c0-1.4-.1-2.7-.4-4z"/></svg>
              <span className="text-5xl font-black text-gray-900">4,9</span>
              <div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-sm text-gray-400 text-left">78 avaliações no Google</p>
              </div>
            </div>
            <a
              href="https://share.google/V5YKvTsYa0jljfJtJ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#F37021] hover:underline font-semibold"
            >
              Verificar no Google →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { nome: "Kaká Oliveira", avatar: "KO", tempo: "há 2 semanas", texto: "Melhor plataforma de envios que já usei! Preços muito abaixo do mercado e o suporte é incrível. Recomendo demais!" },
              { nome: "Elaine Michele", avatar: "EM", tempo: "há 1 mês", texto: "Economizo mais de 40% em cada envio. A coleta gratuita na minha loja é um diferencial enorme. Excelente serviço!" },
              { nome: "Lidia Aparecida", avatar: "LA", tempo: "há 3 semanas", texto: "Atendimento rápido e preços honestos. Nunca mais precisei ir aos Correios. A plataforma é simples e funciona!" },
              { nome: "Rodrigo Santos", avatar: "RS", tempo: "há 2 meses", texto: "Uso a BRHUB há 6 meses e nunca tive problema. O rastreio automático via WhatsApp é o que mais gosto." },
              { nome: "Ana Paula Costa", avatar: "AP", tempo: "há 1 semana", texto: "Super recomendo! Frete mais barato, coleta em domicílio e sistema fácil de usar. Nota 10!" },
              { nome: "Fernando Lima", avatar: "FL", tempo: "há 1 mês", texto: "Plataforma incrível. Economizei muito desde que comecei a usar. A equipe é sempre prestativa e resolve tudo rapidinho." },
            ].map((r, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#F37021]/15 flex items-center justify-center text-[#F37021] font-black text-sm flex-shrink-0">
                    {r.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{r.nome}</p>
                    <p className="text-xs text-gray-400">{r.tempo}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{r.texto}"</p>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.7 19.4-20 0-1.4-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.3 0-9.5-3.4-11.3-8.1l-6.6 4.7C9.5 39.4 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 36.2 44 30.6 44 24c0-1.4-.1-2.7-.4-4z"/></svg>
                  <span className="text-[10px] text-gray-400">Avaliação verificada no Google</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <a
              href="https://share.google/V5YKvTsYa0jljfJtJ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-200 hover:border-[#F37021] rounded-xl px-6 py-3 text-sm font-semibold text-gray-600 hover:text-[#F37021] transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.4-7.7 19.4-20 0-1.4-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.3 0-9.5-3.4-11.3-8.1l-6.6 4.7C9.5 39.4 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 36.2 44 30.6 44 24c0-1.4-.1-2.7-.4-4z"/></svg>
              Ver todas as 78 avaliações no Google
            </a>
          </div>
        </div>
      </section>

      {/* ── Benefícios ── */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#121212] mb-3">Por que lojistas escolhem a BRHUB</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Tudo o que você precisa para enviar mais, gastar menos e crescer sem fricção.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {beneficios.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#F37021]/30 hover:shadow-md transition-all duration-200"
              >
                <div className="w-9 h-9 bg-[#F37021]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-4 h-4 text-[#F37021]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121212] mb-1.5">{b.titulo}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparativo ── */}
      <section className="py-20 px-4 bg-[#121212]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#F37021]/15 text-[#F37021] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 border border-[#F37021]/25">
              Comparativo
            </span>
            <h2 className="text-3xl font-black text-white">Lado a lado</h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                   <th className="text-left py-4 px-5 text-white/40 text-xs uppercase tracking-wide font-semibold">Recurso</th>
                   <th className="text-center py-4 px-4">
                     <img src={logoMelhorEnvio} alt="Melhor Envio" className="h-6 object-contain mx-auto" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
                   </th>
                   <th className="text-center py-4 px-4">
                     <img src={logoSuperfrete} alt="Superfrete" className="h-5 object-contain mx-auto" style={{ filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
                   </th>
                   <th className="text-center py-4 px-4 bg-[#F37021]/10 rounded-t-xl">
                     <img src={logoBrhub} alt="BRHUB" className="h-7 object-contain mx-auto" style={{ filter: 'brightness(0) invert(1)' }} />
                   </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Fretes com desconto real", "✓", "✓", "✓"],
                  ["Coleta gratuita", "✗", "✗", "✓"],
                  ["Rastreio via WhatsApp", "✗", "✗", "✓"],
                  ["Suporte IA 24/7", "✗", "✗", "✓"],
                  ["Sem contrato", "✓", "✓", "✓"],
                  ["Integração Shopify / Nuvemshop", "✓", "✓", "✓"],
                  ["Emissão em massa (planilha)", "✓", "✓", "✓"],
                  ["Notificação proativa de atraso", "✗", "✗", "✓"],
                  ["Multi-usuário", "✗", "✓", "✓"],
                ].map(([recurso, me, sf, brhub], i) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="py-3.5 px-5 text-white/70 text-sm">{recurso}</td>
                    <td className="py-3.5 px-4 text-center text-lg">{me === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-400/60">✗</span>}</td>
                    <td className="py-3.5 px-4 text-center text-lg">{sf === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-400/60">✗</span>}</td>
                    <td className="py-3.5 px-4 text-center text-lg bg-[#F37021]/5">{brhub === "✓" ? <span className="text-[#F37021] font-black">✓</span> : <span className="text-red-400/60">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-10">
            <a
              href="/cadastro-cliente"
              className="inline-flex items-center gap-2 bg-[#F37021] hover:bg-[#e06010] text-white font-black px-8 py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-orange-900/40 text-base"
            >
              Criar conta grátis →
            </a>
            <p className="text-white/20 text-xs text-center mt-4">
              Dados baseados nos sites oficiais dos concorrentes. Verificado em fevereiro/2026.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConectaOportunidade;
