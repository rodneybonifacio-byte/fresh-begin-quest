import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';

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

export const DashboardParceiro = () => {
  const navigate = useNavigate();
  const [parceiro, setParceiro] = useState<ParceiroData | null>(null);
  const [clientes, setClientes] = useState<ClienteIndicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'link' | 'codigo' | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clientes' | 'comissoes' | 'config'>('overview');

  useEffect(() => {
    // Obter token do parceiro do localStorage
    const parceiroToken = localStorage.getItem('parceiro_token');
    if (!parceiroToken) {
      navigate('/conecta/login');
      return;
    }
    loadData(parceiroToken);
  }, [navigate]);

  const loadData = async (token: string) => {
    try {
      // Usar edge function para buscar dados (contorna RLS)
      const { data, error } = await supabase.functions.invoke('parceiro-dashboard', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('Erro ao invocar função:', error);
        throw error;
      }

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
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('parceiro_token');
    localStorage.removeItem('parceiro_data');
    navigate('/conecta');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!parceiro) {
    return null;
  }

  const stats = [
    { 
      icon: Users, 
      label: 'Clientes Ativos', 
      value: clientes.filter(c => c.status === 'ativo').length,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    { 
      icon: DollarSign, 
      label: 'Comissão Total', 
      value: `R$ ${clientes.reduce((acc, c) => acc + Number(c.comissao_gerada || 0), 0).toFixed(2)}`,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    { 
      icon: TrendingUp, 
      label: 'Consumo Total', 
      value: `R$ ${clientes.reduce((acc, c) => acc + Number(c.consumo_total || 0), 0).toFixed(2)}`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100'
    },
    { 
      icon: Wallet, 
      label: 'A Receber', 
      value: `R$ ${clientes.reduce((acc, c) => acc + Number(c.comissao_gerada || 0), 0).toFixed(2)}`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-white">
              C+
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Conecta+</h1>
              <p className="text-xs text-gray-500">Painel do Parceiro</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">
              Olá, <strong className="text-gray-900">{parceiro.nome.split(' ')[0]}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Link de Indicação */}
        <motion.div 
          className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Seu Link de Indicação</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link exclusivo</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={parceiro.link_indicacao}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600"
                />
                <button
                  onClick={() => handleCopy('link', parceiro.link_indicacao)}
                  className="p-3 bg-orange-100 hover:bg-orange-200 rounded-xl transition-colors"
                >
                  {copied === 'link' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-orange-500" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Código de parceiro</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={parceiro.codigo_parceiro}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-mono"
                />
                <button
                  onClick={() => handleCopy('codigo', parceiro.codigo_parceiro)}
                  className="p-3 bg-orange-100 hover:bg-orange-200 rounded-xl transition-colors"
                >
                  {copied === 'codigo' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-orange-500" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold mb-1 text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'comissoes', label: 'Comissões', icon: FileText },
            { id: 'config', label: 'Configurações', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'clientes' && (
          <motion.div 
            className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Clientes Indicados</h3>
            </div>
            {clientes.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Nenhum cliente indicado ainda</p>
                <p className="text-sm text-gray-400">Compartilhe seu link para começar a ganhar!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Consumo</th>
                      <th className="px-4 py-3 text-right">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{cliente.cliente_nome || 'N/A'}</p>
                            <p className="text-xs text-gray-400">{cliente.cliente_email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {new Date(cliente.data_associacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cliente.status === 'ativo' 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {cliente.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600">
                          R$ {Number(cliente.consumo_total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-green-600">
                          R$ {Number(cliente.comissao_gerada || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'overview' && (
          <motion.div 
            className="grid lg:grid-cols-2 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <h3 className="font-semibold mb-4 text-gray-900">Últimas Atividades</h3>
              {clientes.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma atividade recente</p>
              ) : (
                <div className="space-y-3">
                  {clientes.slice(0, 5).map((cliente) => (
                    <div key={cliente.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{cliente.cliente_nome || 'Novo cliente'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(cliente.data_associacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <h3 className="font-semibold mb-4 text-gray-900">Dicas para Ganhar Mais</h3>
              <ul className="space-y-3">
                {[
                  'Compartilhe seu link nas redes sociais',
                  'Envie para grupos de lojistas no WhatsApp',
                  'Converse com comerciantes do Brás',
                  'Participe de eventos de e-commerce'
                ].map((dica, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs text-orange-500 font-medium flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    {dica}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div 
            className="max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <h3 className="font-semibold mb-6 text-gray-900">Dados Bancários</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Chave PIX</label>
                  <input
                    type="text"
                    value={parceiro.chave_pix || ''}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600"
                    placeholder="Sua chave PIX para recebimento"
                    readOnly
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Pagamentos são realizados todo dia 10, para comissões acima de R$ 50.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'comissoes' && (
          <motion.div 
            className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="font-semibold mb-4 text-gray-900">Extrato de Comissões</h3>
            <p className="text-gray-500 text-sm">
              As comissões são calculadas automaticamente com base no consumo dos seus clientes indicados.
              Você recebe 20% do lucro líquido de cada etiqueta emitida.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900">Próximo pagamento</p>
                  <p className="text-sm text-gray-500">Dia 10 do próximo mês</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default DashboardParceiro;
