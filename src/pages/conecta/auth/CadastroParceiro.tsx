import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';

export const CadastroParceiro = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpfCnpj: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
    chavePix: '',
    aceitouTermos: false
  });

  const generateSlug = (nome: string): string => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não conferem');
      return;
    }

    if (!formData.aceitouTermos) {
      toast.error('Você precisa aceitar os termos do programa');
      return;
    }

    setLoading(true);

    try {
      const codigoParceiro = `BRHUB-${generateSlug(formData.nome).toUpperCase()}`;
      const linkIndicacao = `${window.location.origin}/cadastro-cliente?ref=${codigoParceiro.toLowerCase()}`;

      // Verificar se email já existe
      const { data: existente } = await supabase
        .from('parceiros')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (existente) {
        toast.error('Este email já está cadastrado');
        setLoading(false);
        return;
      }

      // Criar parceiro
      const { error } = await supabase
        .from('parceiros')
        .insert({
          nome: formData.nome,
          email: formData.email.toLowerCase(),
          cpf_cnpj: formData.cpfCnpj.replace(/\D/g, ''),
          telefone: formData.telefone.replace(/\D/g, ''),
          senha_hash: formData.senha, // Em produção, usar hash
          codigo_parceiro: codigoParceiro,
          link_indicacao: linkIndicacao,
          chave_pix: formData.chavePix || null,
          status: 'aprovado' // Auto-aprovar por enquanto
        });

      if (error) throw error;

      setSuccess(true);
      toast.success('Cadastro realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.code === '23505') {
        toast.error('Este email ou código já está em uso');
      } else {
        toast.error('Erro ao cadastrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Cadastro realizado!</h1>
          <p className="text-gray-500 mb-8">
            Sua conta foi criada com sucesso. Agora você pode acessar o painel e começar a indicar clientes.
          </p>
          <button 
            onClick={() => navigate('/conecta/login')}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
          >
            Fazer Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-white py-12 px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-100/40 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        className="w-full max-w-lg mx-auto relative z-10"
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
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Seja um Parceiro Conecta+</h1>
          <p className="text-gray-500">Preencha seus dados para começar a ganhar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
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
                CPF/CNPJ *
              </label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400 pr-12"
                  placeholder="••••••••"
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar senha *
              </label>
              <input
                type="password"
                value={formData.confirmarSenha}
                onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave PIX (para recebimento)
              </label>
              <input
                type="text"
                value={formData.chavePix}
                onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-gray-900 placeholder-gray-400"
                placeholder="CPF, email, telefone ou chave aleatória"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100">
            <input
              type="checkbox"
              id="termos"
              checked={formData.aceitouTermos}
              onChange={(e) => setFormData({ ...formData, aceitouTermos: e.target.checked })}
              className="mt-1 w-5 h-5 rounded border-gray-300 bg-white text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="termos" className="text-sm text-gray-600">
              Li e aceito os <span className="text-orange-500 font-medium">Termos do Programa Conecta+</span> e concordo em receber 10% de comissão sobre o lucro líquido dos clientes que eu indicar.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Criar minha conta de parceiro'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Já é parceiro?{' '}
            <button 
              onClick={() => navigate('/conecta/login')}
              className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Fazer login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CadastroParceiro;
