import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';

export const LoginParceiro = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Buscar parceiro pelo email e verificar senha
      const { data: parceiro, error } = await supabase
        .from('parceiros')
        .select('*')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!parceiro) {
        toast.error('Email ou senha incorretos');
        setLoading(false);
        return;
      }

      // Verificar senha (em produção, usar bcrypt no backend)
      if (parceiro.senha_hash !== formData.senha) {
        toast.error('Email ou senha incorretos');
        setLoading(false);
        return;
      }

      if (parceiro.status === 'pendente') {
        toast.warning('Sua conta ainda está pendente de aprovação');
        setLoading(false);
        return;
      }

      if (parceiro.status === 'suspenso' || parceiro.status === 'cancelado') {
        toast.error('Sua conta está suspensa ou cancelada');
        setLoading(false);
        return;
      }

      // Salvar dados do parceiro no localStorage
      localStorage.setItem('parceiro_token', parceiro.id);
      localStorage.setItem('parceiro_data', JSON.stringify({
        id: parceiro.id,
        nome: parceiro.nome,
        email: parceiro.email,
        codigo_parceiro: parceiro.codigo_parceiro
      }));

      toast.success('Login realizado com sucesso!');
      navigate('/conecta/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-white flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-100/40 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button 
          onClick={() => navigate('/conecta')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-2xl text-white mx-auto mb-4">
            C+
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Entrar no Conecta+</h1>
          <p className="text-gray-500">Acesse seu painel de parceiro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400 pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Ainda não é parceiro?{' '}
            <button 
              onClick={() => navigate('/conecta/cadastro')}
              className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Cadastre-se aqui
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginParceiro;
