import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Check,
  LogOut,
  Settings,
  BarChart3,
  FileText,
  Wallet,
  Calendar,
  Zap,
  ChevronRight,
  Link2,
  Hash,
  Share2,
  ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';
import { ConectaOportunidade } from '../../site/ConectaOportunidade';

interface ParceiroData {
  id: string;
  nome: string;
  email: string;
  codigo_parceiro: string;
  link_indicacao: string;
  total_clientes_ativos: number | null;
  total_comissao_acumulada: number | null;
  chave_pix: string | null;
}

interface ClienteIndicado {
  id: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  data_associacao: string;
  status: string | null;
  consumo_total: number | null;
  comissao_gerada: number | null;
}

type TabId = 'overview' | 'clientes' | 'comissoes' | 'simulador' | 'config';

export const DashboardParceiro = () => {
  const navigate = useNavigate();
  const [parceiro, setParceiro] = useState<ParceiroData | null>(null);
  const [clientes, setClientes] = useState<ClienteIndicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'link' | 'codigo' | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const parceiroToken = localStorage.getItem('parceiro_token');
    if (!parceiroToken) {
      navigate('/conecta/login');
      return;
    }
    loadData(parceiroToken);
  }, [navigate]);

  const loadData = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('parceiro-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (error) throw error;
      if (!data.success) {
        if (data.error === 'Token expirado' || data.error === 'Token inválido') {
          localStorage.removeItem('parceiro_token');
          localStorage.removeItem('parceiro_data');
          toast.error('Sessão expirada. Faça login novamente.');
          navigate('/conecta/login');
          return;
        }
        throw new Error(data.error);
      }
      setParceiro(data.parceiro);
      setClientes(data.clientes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (type: 'link' | 'codigo', value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    toast.success('Copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('parceiro_token');
    localStorage.removeItem('parceiro_data');
    navigate('/conecta');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-white text-sm animate-pulse">
            C+
          </div>
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!parceiro) return null;

  const totalComissao = clientes.reduce((acc, c) => acc + Number(c.comissao_gerada || 0), 0);
  const totalConsumo = clientes.reduce((acc, c) => acc + Number(c.consumo_total || 0), 0);
  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;

  const stats = [
    { icon: Users, label: 'Ativos', value: clientesAtivos, color: 'text-blue-500', bg: 'bg-blue-50', accent: '#3B82F6' },
    { icon: DollarSign, label: 'Comissão', value: `R$ ${totalComissao.toFixed(2)}`, color: 'text-green-500', bg: 'bg-green-50', accent: '#22C55E' },
    { icon: TrendingUp, label: 'Consumo', value: `R$ ${totalConsumo.toFixed(2)}`, color: 'text-purple-500', bg: 'bg-purple-50', accent: '#A855F7' },
    { icon: Wallet, label: 'A Receber', value: `R$ ${totalComissao.toFixed(2)}`, color: 'text-orange-500', bg: 'bg-orange-50', accent: '#F37021' },
  ];

  const tabs = [
    { id: 'overview' as TabId, label: 'Início', icon: BarChart3 },
    { id: 'clientes' as TabId, label: 'Clientes', icon: Users },
    { id: 'comissoes' as TabId, label: 'Comissões', icon: FileText },
    { id: 'simulador' as TabId, label: 'Simulador', icon: Zap },
    { id: 'config' as TabId, label: 'Config', icon: Settings },
  ];

  const firstName = parceiro.nome.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-black">
              C+
            </div>
            <span className="font-semibold text-gray-900 text-sm">Conecta+</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">
              Olá, <span className="font-semibold text-gray-900">{firstName}</span>
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Hero banner */}
        <div className="px-4 pt-5 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121212] to-[#1f1f1f] p-5"
          >
            {/* Decorative circle */}
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-orange-500/10" />
            <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-orange-500/5" />
            
            <p className="text-xs text-gray-400 mb-1">Bem-vindo de volta</p>
            <h1 className="text-xl font-black text-white mb-4">{firstName} 👋</h1>
            
            {/* Link card */}
            <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs text-gray-400">Seu link de indicação</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleCopy('link', parceiro.link_indicacao)}
                    className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied === 'link' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'link' ? 'Copiado!' : 'Copiar'}
                  </button>
                  {navigator.share && (
                    <button
                      onClick={() => navigator.share({ url: parceiro.link_indicacao, title: 'BRHUB Envios' })}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-white/70 text-xs font-mono truncate">{parceiro.link_indicacao}</p>
            </div>

            {/* Código */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Código: </span>
                <span className="text-xs text-white font-mono font-semibold">{parceiro.codigo_parceiro}</span>
              </div>
              <button
                onClick={() => handleCopy('codigo', parceiro.codigo_parceiro)}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
              >
                {copied === 'codigo' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === 'codigo' ? 'Copiado' : 'Copiar'}
              </button>

            {/* Botão compartilhar simulador */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide font-bold">Compartilhar simulador de frete</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/oportunidade?ref=${parceiro.codigo_parceiro}`;
                    handleCopy('link', url);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {copied === 'link' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'link' ? 'Link copiado!' : 'Copiar link'}
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/oportunidade?ref=${parceiro.codigo_parceiro}`;
                    const texto = `Simule agora o quanto você economiza em frete com a BRHUB! 🚀\n\n${url}`;
                    if (navigator.share) {
                      navigator.share({ url, title: 'Simulador BRHUB Envios', text: texto });
                    } else {
                      navigator.clipboard.writeText(texto);
                      toast.success('Texto copiado para compartilhar!');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#F37021] hover:bg-[#e06010] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-lg shadow-orange-500/30"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar
                </button>
              </div>
            </div>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="px-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-lg font-black text-gray-900 leading-none mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="sticky top-14 z-40 bg-[#F5F5F7] pt-4 px-4 pb-1">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide bg-white rounded-2xl p-1 border border-gray-100">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-1 justify-center transition-all ${
                    isActive
                      ? 'bg-[#121212] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 pt-4 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Últimas atividades */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Últimas atividades</h3>
                    {clientes.length > 0 && (
                      <button onClick={() => setActiveTab('clientes')} className="text-orange-500 text-xs font-semibold flex items-center gap-0.5">
                        Ver todos <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {clientes.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Nenhum cliente ainda</p>
                      <p className="text-xs text-gray-400 mt-1">Compartilhe seu link para começar!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {clientes.slice(0, 5).map((cliente) => (
                        <div key={cliente.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-orange-500">
                              {(cliente.cliente_nome || 'N')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{cliente.cliente_nome || 'Novo cliente'}</p>
                            <p className="text-xs text-gray-400">{new Date(cliente.data_associacao).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-green-600">+R$ {Number(cliente.comissao_gerada || 0).toFixed(2)}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              cliente.status === 'ativo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {cliente.status || 'pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dicas */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">💡 Dicas para ganhar mais</h3>
                  <div className="space-y-2.5">
                    {[
                      'Compartilhe seu link nas redes sociais',
                      'Envie para grupos de lojistas no WhatsApp',
                      'Converse com comerciantes da sua região',
                      'Participe de eventos de e-commerce',
                    ].map((dica, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-lg bg-orange-100 flex items-center justify-center text-[10px] font-black text-orange-500 flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-gray-600">{dica}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'clientes' && (
              <motion.div
                key="clientes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="px-4 py-3.5 border-b border-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">Clientes indicados</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{clientes.length} no total</p>
                </div>
                {clientes.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Nenhum cliente indicado</p>
                    <p className="text-xs text-gray-400">Compartilhe seu link para começar a ganhar!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {clientes.map((cliente) => (
                      <div key={cliente.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-black text-orange-500">
                                {(cliente.cliente_nome || 'N')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{cliente.cliente_nome || 'N/A'}</p>
                              <p className="text-xs text-gray-400 truncate">{cliente.cliente_email || '—'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                            cliente.status === 'ativo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {cliente.status || 'pendente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2.5 pl-12">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Consumo</p>
                            <p className="text-sm font-semibold text-gray-700">R$ {Number(cliente.consumo_total || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Comissão</p>
                            <p className="text-sm font-semibold text-green-600">R$ {Number(cliente.comissao_gerada || 0).toFixed(2)}</p>
                          </div>
                          <div className="ml-auto">
                            <p className="text-[10px] text-gray-400">{new Date(cliente.data_associacao).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'comissoes' && (
              <motion.div
                key="comissoes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Resumo financeiro */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-4">Resumo financeiro</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Total gerado</span>
                      <span className="text-sm font-semibold text-gray-900">R$ {totalComissao.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Consumo total da rede</span>
                      <span className="text-sm font-semibold text-gray-900">R$ {totalConsumo.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-semibold text-gray-900">A receber</span>
                      <span className="text-base font-black text-green-600">R$ {totalComissao.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Como funciona */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Como funciona</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Você recebe <span className="font-bold text-orange-500">20% do lucro líquido</span> de cada etiqueta emitida pelos seus clientes indicados. As comissões são calculadas automaticamente.
                  </p>
                </div>

                {/* Próximo pagamento */}
                <div className="bg-[#121212] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Próximo pagamento</p>
                      <p className="text-xs text-gray-400">Dia 10 do próximo mês · mín. R$ 50</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-orange-400 ml-auto" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Perfil */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Meu perfil</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Nome</span>
                      <span className="text-sm font-medium text-gray-900">{parceiro.nome}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">E-mail</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[60%] text-right">{parceiro.email}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Código</span>
                      <span className="text-sm font-mono font-bold text-orange-500">{parceiro.codigo_parceiro}</span>
                    </div>
                  </div>
                </div>

                {/* Dados bancários */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Dados bancários</h3>
                  </div>
                  <div className="px-4 py-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Chave PIX</label>
                    <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <p className="text-sm text-gray-700 font-medium">
                        {parceiro.chave_pix || <span className="text-gray-400 font-normal">Não cadastrada</span>}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Para atualizar sua chave PIX, entre em contato com o suporte.
                    </p>
                  </div>
                </div>

                {/* Sair */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </motion.div>
            )}

            {activeTab === 'simulador' && (
              <motion.div
                key="simulador"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="-mx-4 -mb-24"
              >
                <ConectaOportunidade referralCode={parceiro.codigo_parceiro} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DashboardParceiro;
