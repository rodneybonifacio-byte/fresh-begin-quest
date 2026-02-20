import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../integrations/supabase/client';

const TermosModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Termos do Programa Conecta+</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-gray-600 text-sm leading-relaxed">
            <h3 className="font-semibold text-gray-900">1. Definições</h3>
            <p>
              O Programa BRHUB Conecta+ é um programa de indicação que permite que parceiros 
              cadastrados recebam comissões por indicar novos clientes para a plataforma BRHUB Envios.
            </p>

            <h3 className="font-semibold text-gray-900">2. Elegibilidade</h3>
            <p>
              Qualquer pessoa física ou jurídica pode se tornar um parceiro Conecta+, desde que 
              possua CPF ou CNPJ válido e aceite integralmente estes termos.
            </p>

            <h3 className="font-semibold text-gray-900">3. Comissões</h3>
            <p>
              O parceiro receberá <strong>20% (vinte por cento) do lucro líquido</strong> gerado 
              por cada cliente indicado, enquanto este permanecer ativo na plataforma. O lucro 
              líquido é calculado como a diferença entre o valor cobrado do cliente e o custo 
              operacional do frete.
            </p>

            <h3 className="font-semibold text-gray-900">4. Vinculação de Clientes</h3>
            <p>
              Um cliente é vinculado ao parceiro quando se cadastra utilizando o link de indicação 
              ou código do parceiro. A vinculação é vitalícia, desde que o cliente permaneça ativo.
            </p>

            <h3 className="font-semibold text-gray-900">5. Pagamentos</h3>
            <p>
              Os pagamentos são realizados mensalmente, via PIX, até o dia 10 do mês subsequente 
              ao período de apuração. O valor mínimo para saque é de R$ 50,00. Valores inferiores 
              serão acumulados para o próximo período.
            </p>

            <h3 className="font-semibold text-gray-900">6. Obrigações do Parceiro</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manter dados cadastrais atualizados</li>
              <li>Não fazer promessas falsas sobre a plataforma</li>
              <li>Não utilizar práticas de spam ou marketing abusivo</li>
              <li>Respeitar as políticas de uso da marca BRHUB</li>
            </ul>

            <h3 className="font-semibold text-gray-900">7. Cancelamento</h3>
            <p>
              O BRHUB reserva-se o direito de suspender ou cancelar a participação de qualquer 
              parceiro que viole estes termos, pratique fraude ou prejudique a reputação da marca.
            </p>

            <h3 className="font-semibold text-gray-900">8. Alterações</h3>
            <p>
              Estes termos podem ser alterados a qualquer momento, com aviso prévio de 30 dias 
              aos parceiros cadastrados.
            </p>

            <h3 className="font-semibold text-gray-900">9. Foro</h3>
            <p>
              Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias 
              decorrentes deste programa.
            </p>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
              Última atualização: Dezembro de 2024
            </p>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all"
            >
              Entendi
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const CadastroParceiro = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showTermos, setShowTermos] = useState(false);
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
      const { data, error } = await supabase.functions.invoke('registrar-parceiro', {
        body: {
          nome: formData.nome,
          email: formData.email,
          cpf_cnpj: formData.cpfCnpj,
          telefone: formData.telefone,
          senha: formData.senha,
          chave_pix: formData.chavePix || null
        }
      });

      if (error) {
        // Tentar extrair mensagem real do body da resposta de erro
        let mensagem = 'Erro ao cadastrar. Tente novamente.';
        try {
          const context = (error as any)?.context;
          if (context?.clone) {
            const text = await context.clone().text();
            const json = JSON.parse(text);
            if (json?.error) mensagem = json.error;
          }
        } catch { /* usa mensagem padrão */ }
        toast.error(mensagem);
        setLoading(false);
        return;
      }

      if (!data || !data.success) {
        toast.error(data?.error || 'Erro ao cadastrar. Tente novamente.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success('Cadastro realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast.error(error?.message || 'Erro ao cadastrar. Tente novamente.');
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
              Li e aceito os{' '}
              <button 
                type="button"
                onClick={() => setShowTermos(true)}
                className="text-orange-500 font-medium hover:underline"
              >
                Termos do Programa Conecta+
              </button>{' '}
              e concordo em receber 20% de comissão sobre o lucro líquido dos clientes que eu indicar.
            </label>
          </div>

          <TermosModal isOpen={showTermos} onClose={() => setShowTermos(false)} />

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
