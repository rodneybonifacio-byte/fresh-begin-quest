import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { isValid as isValidCPF } from "@fnando/cpf";
import { isValid as isValidCNPJ } from "@fnando/cnpj";
import { InputLabel } from "../../../components/input-label";
import { ButtonComponent } from "../../../components/button";
import { LoadSpinner } from "../../../components/loading";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";
import { useAddress } from "../../../hooks/useAddress";
import { ModalBemVindoCadastro } from "../../../components/ModalBemVindoCadastro";
import { PromoBannerRecarga } from "../../../components/PromoBannerRecarga";
import { supabase } from "../../../integrations/supabase/client";
import { Building2, MapPin, Lock, Check, ChevronRight, ChevronLeft, Loader2, X } from "lucide-react";
const schemaCadastroCliente = yup.object().shape({
  nomeEmpresa: yup.string().required("O nome da empresa é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
  nomeResponsavel: yup.string().required("O nome do responsável é obrigatório").min(3, "O nome do responsável deve ter pelo menos 3 caracteres"),
  cpfCnpj: yup.string().required("O CPF/CNPJ é obrigatório").test('cpf-cnpj-valido', 'CPF/CNPJ inválido', function (value) {
    if (!value) return false;
    const numeros = value.replace(/\D/g, '');
    if (numeros.length === 11) {
      return isValidCPF(numeros);
    } else if (numeros.length === 14) {
      return isValidCNPJ(numeros);
    }
    return false;
  }),
  telefone: yup.string(),
  celular: yup.string().required("O celular é obrigatório"),
  cep: yup.string().required("O CEP é obrigatório"),
  logradouro: yup.string().required("O logradouro é obrigatório"),
  numero: yup.string().required("O número é obrigatório"),
  complemento: yup.string(),
  bairro: yup.string().required("O bairro é obrigatório"),
  localidade: yup.string().required("A cidade é obrigatória"),
  uf: yup.string().required("O estado é obrigatório"),
  email: yup.string().required("O e-mail é obrigatório").email("E-mail inválido"),
  senha: yup.string().required("A senha é obrigatória").min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmarSenha: yup.string().required("Confirme a senha").oneOf([yup.ref('senha')], "As senhas não coincidem")
});
type CadastroClienteFormData = yup.InferType<typeof schemaCadastroCliente>;
const steps = [{
  id: 1,
  title: "Empresa",
  icon: Building2
}, {
  id: 2,
  title: "Endereço",
  icon: MapPin
}, {
  id: 3,
  title: "Acesso",
  icon: Lock
}];
export const CadastroCliente = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [posicaoCadastro, setPosicaoCadastro] = useState(0);
  const [codigoParceiro, setCodigoParceiro] = useState<string | null>(null);
  const [parceiroValidado, setParceiroValidado] = useState<{ valido: boolean; nome: string | null } | null>(null);
  const [validandoParceiro, setValidandoParceiro] = useState(false);
  const {
    onBuscaCep
  } = useAddress();

  // Validar código do parceiro
  const validarCodigoParceiro = async (codigo: string) => {
    if (!codigo || codigo.length < 3) {
      setParceiroValidado(null);
      return;
    }
    
    setValidandoParceiro(true);
    try {
      const { data, error } = await supabase
        .from('parceiros')
        .select('nome, codigo_parceiro, status')
        .eq('codigo_parceiro', codigo.toUpperCase())
        .eq('status', 'aprovado')
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao validar parceiro:', error);
        setParceiroValidado({ valido: false, nome: null });
        return;
      }
      
      if (data) {
        setParceiroValidado({ valido: true, nome: data.nome });
        console.log('✅ Parceiro validado:', data.nome);
      } else {
        setParceiroValidado({ valido: false, nome: null });
      }
    } catch (error) {
      console.error('Erro ao validar parceiro:', error);
      setParceiroValidado({ valido: false, nome: null });
    } finally {
      setValidandoParceiro(false);
    }
  };

  // Captura código de indicação do parceiro via URL (?ref=CODIGO)
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setCodigoParceiro(refCode.toUpperCase());
      validarCodigoParceiro(refCode);
      console.log('🔗 Código de indicação capturado:', refCode);
    }
  }, [searchParams]);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    setValue,
    setFocus,
    clearErrors,
    trigger
  } = useForm<CadastroClienteFormData>({
    resolver: yupResolver(schemaCadastroCliente),
    mode: 'onChange'
  });
  const handleCepChange = async (cep: string) => {
    const cepFormatado = cep.replace(/\D/g, '');
    if (cepFormatado.length === 8) {
      try {
        const endereco = await onBuscaCep(cepFormatado, () => {});
        if (endereco) {
          setValue('logradouro', endereco.logradouro || '');
          setValue('bairro', endereco.bairro || '');
          setValue('localidade', endereco.localidade || '');
          setValue('uf', endereco.uf || '');
          clearErrors(['logradouro', 'bairro', 'localidade', 'uf']);
          setFocus('numero');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast.error('Erro ao buscar CEP');
      }
    }
  };
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (value.length <= 11) {
      formatted = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      formatted = value.substring(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    setValue('cpfCnpj', formatted);
  };
  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof CadastroClienteFormData)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['nomeEmpresa', 'nomeResponsavel', 'cpfCnpj', 'celular'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['cep', 'logradouro', 'numero', 'bairro', 'localidade', 'uf'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['email', 'senha', 'confirmarSenha'];
    }
    const result = await trigger(fieldsToValidate);
    return result;
  };
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  const onSubmit = async (data: CadastroClienteFormData) => {
    setIsLoading(true);
    try {
      const cpfCnpjLimpo = data.cpfCnpj.replace(/\D/g, '');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/criar-cliente-autocadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          nomeEmpresa: data.nomeEmpresa,
          nomeResponsavel: data.nomeResponsavel,
          cpfCnpj: cpfCnpjLimpo,
          telefone: data.telefone || '',
          celular: data.celular,
          endereco: {
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento || '',
            bairro: data.bairro,
            localidade: data.localidade,
            uf: data.uf
          },
          email: data.email,
          senha: data.senha,
          codigoParceiro: codigoParceiro // Código de indicação do parceiro Conecta+
        })
      });
      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('Erro ao fazer parse do JSON:', e);
      }
      if (!response.ok) {
        const errorText = JSON.stringify(responseData).toLowerCase();
        const isEmailDuplicado = errorText.includes('e-mail') || errorText.includes('email');
        const isCpfCnpjDuplicado = errorText.includes('cpf') || errorText.includes('cnpj');
        const isDuplicado = isEmailDuplicado || isCpfCnpjDuplicado || errorText.includes('já existe') || errorText.includes('duplicado');
        if (isDuplicado) {
          if (isEmailDuplicado) {
            setErrorModalMessage('E-mail já cadastrado');
          } else if (isCpfCnpjDuplicado) {
            setErrorModalMessage('CPF/CNPJ já cadastrado');
          } else {
            setErrorModalMessage('Dados já cadastrados');
          }
          setUserEmail(data.email);
          setShowErrorModal(true);
        } else {
          toast.error('Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      // Salvar token do novo usuário para login automático
      const userToken = responseData.userToken;
      if (userToken) {
        console.log('✅ Token do usuário recebido, salvando para login automático...');
        // Limpa token antigo antes de setar o novo
        localStorage.removeItem('token');
        localStorage.setItem('token', userToken);
        localStorage.setItem('auto_login', 'true');
        // Limpa verificação de remetente para forçar abertura do modal
        sessionStorage.removeItem('remetente_verificado');
      }
      const posicao = responseData.posicaoCadastro || 0;
      setPosicaoCadastro(posicao);
      setUserEmail(data.email);
      localStorage.setItem('redirect_to_remetente', 'true');
      setShowWelcomeModal(true);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return <LoadSpinner mensagem="Criando sua conta..." />;
  }
  return <>
            {/* Modal de Erro */}
            {showErrorModal && <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
                    <div className="bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-900/30 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in-0 zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{errorModalMessage}</h3>
                                <p className="text-base text-slate-600 dark:text-slate-400">Este dado já está vinculado a uma conta.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                                <ButtonComponent onClick={() => {
              setShowErrorModal(false);
              navigate('/login', {
                state: {
                  email: userEmail
                }
              });
            }} variant="primary" className="flex-1 h-12 font-semibold">
                                    Fazer Login
                                </ButtonComponent>
                                <ButtonComponent onClick={() => setShowErrorModal(false)} variant="ghost" className="flex-1 h-12 border border-slate-300 dark:border-slate-600">
                                    Fechar
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>}

            <ModalBemVindoCadastro isOpen={showWelcomeModal} onClose={() => {
      setShowWelcomeModal(false);
      // Se tiver token de auto_login, vai direto para /app
      const hasAutoLogin = localStorage.getItem('auto_login') === 'true';
      if (hasAutoLogin) {
        navigate('/app');
      } else {
        navigate('/login', {
          state: {
            email: userEmail,
            mensagem: 'Conta criada com sucesso!'
          }
        });
      }
    }} posicaoCadastro={posicaoCadastro} />

            <PromoBannerRecarga variant="featured" />

            <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/10 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="absolute top-4 right-4 z-10">
                    <ThemeToggle />
                </div>
                
                <div className="w-full max-w-2xl relative z-10 animate-fade-in">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                        
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-foreground mb-1">Criar Conta</h1>
                            <p className="text-muted-foreground text-sm">Preencha os dados para começar</p>
                        </div>
                    </div>

                    {/* Timeline/Stepper */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center">
                            {steps.map((step, index) => <div key={step.id} className="flex items-center">
                                    {/* Step Circle */}
                                    <div className="flex flex-col items-center">
                                        <div className={`
                                                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                                                ${currentStep > step.id ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : currentStep === step.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'bg-muted text-muted-foreground'}
                                            `}>
                                            {currentStep > step.id ? <Check className="w-5 h-5 text-slate-50 bg-transparent" /> : <step.icon className="w-5 h-5" />}
                                        </div>
                                        <span className={`
                                            mt-2 text-xs font-medium transition-colors
                                            ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'}
                                        `}>
                                            {step.title}
                                        </span>
                                    </div>
                                    
                                    {/* Connector Line */}
                                    {index < steps.length - 1 && <div className={`
                                            w-16 sm:w-24 h-1 mx-2 rounded-full transition-colors duration-300
                                            ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'}
                                        `} />}
                                </div>)}
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            {/* Step 1: Dados da Empresa */}
                            {currentStep === 1 && <div className="space-y-5 animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Building2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground">Dados da Empresa</h2>
                                            <p className="text-sm text-muted-foreground">Informações básicas do seu negócio</p>
                                        </div>
                                    </div>
                                    
                                    <InputLabel labelTitulo="Nome / Razão Social *" placeholder="Digite o nome da empresa" {...register("nomeEmpresa")} fieldError={errors.nomeEmpresa?.message} />
                                    
                                    <InputLabel labelTitulo="Nome do Responsável *" placeholder="Digite o nome do responsável" {...register("nomeResponsavel")} fieldError={errors.nomeResponsavel?.message} />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputLabel labelTitulo="CPF/CNPJ *" placeholder="Digite o CPF ou CNPJ" {...register("cpfCnpj", {
                  onChange: handleCpfCnpjChange
                })} fieldError={errors.cpfCnpj?.message} maxLength={18} />

                                        <InputLabel labelTitulo="Telefone" placeholder="(00) 0000-0000" {...register("telefone")} fieldError={errors.telefone?.message} maxLength={14} onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  let formatted = value;
                  if (value.length > 2) {
                    formatted = `(${value.slice(0, 2)}) ${value.slice(2, 6)}${value.length > 6 ? '-' + value.slice(6, 10) : ''}`;
                  } else if (value.length > 0) {
                    formatted = `(${value}`;
                  }
                  setValue('telefone', formatted);
                }} />
                                    </div>

                                    {/* Campo Código de Indicação Conecta+ */}
                                    <div className="relative">
                                        <InputLabel 
                                            labelTitulo="Código de Indicação (opcional)" 
                                            placeholder="Ex: PARCEIRO123" 
                                            value={codigoParceiro || ''}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase() || null;
                                                setCodigoParceiro(value);
                                                setParceiroValidado(null);
                                            }}
                                            onBlur={() => {
                                                if (codigoParceiro) {
                                                    validarCodigoParceiro(codigoParceiro);
                                                }
                                            }}
                                        />
                                        {/* Status da validação */}
                                        <div className="absolute right-3 top-9">
                                            {validandoParceiro && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Validando...
                                                </div>
                                            )}
                                            {!validandoParceiro && parceiroValidado?.valido && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                                    <Check className="w-3 h-3" />
                                                    Válido
                                                </div>
                                            )}
                                            {!validandoParceiro && parceiroValidado && !parceiroValidado.valido && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                                                    <X className="w-3 h-3" />
                                                    Inválido
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Mensagem de feedback */}
                                        {parceiroValidado?.valido && parceiroValidado.nome && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                Indicado por: <span className="font-semibold">{parceiroValidado.nome}</span>
                                            </p>
                                        )}
                                        {parceiroValidado && !parceiroValidado.valido && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                Código de parceiro não encontrado ou inativo.
                                            </p>
                                        )}
                                        {!parceiroValidado && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Recebeu um código de um parceiro? Insira aqui para vincular sua conta.
                                            </p>
                                        )}
                                    </div>

                                    <InputLabel labelTitulo="Celular (WhatsApp) *" placeholder="(00) 9 0000-0000" {...register("celular")} fieldError={errors.celular?.message} maxLength={16} onChange={e => {
                const value = e.target.value.replace(/\D/g, '');
                let formatted = value;
                if (value.length > 2) {
                  if (value.length <= 7) {
                    formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                  } else {
                    formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(3, 7)}-${value.slice(7, 11)}`;
                  }
                } else if (value.length > 0) {
                  formatted = `(${value}`;
                }
                setValue('celular', formatted);
              }} />
                                </div>}

                            {/* Step 2: Endereço */}
                            {currentStep === 2 && <div className="space-y-5 animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <MapPin className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground">Endereço</h2>
                                            <p className="text-sm text-muted-foreground">Localização do seu negócio</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputLabel labelTitulo="CEP *" placeholder="00000-000" {...register("cep")} fieldError={errors.cep?.message} onChange={e => {
                  const value = e.target.value;
                  setValue('cep', value);
                  handleCepChange(value);
                }} />

                                        <InputLabel labelTitulo="Rua *" placeholder="Digite o logradouro" {...register("logradouro")} fieldError={errors.logradouro?.message} />

                                        <InputLabel labelTitulo="Número *" placeholder="Número" {...register("numero")} fieldError={errors.numero?.message} />

                                        <InputLabel labelTitulo="Complemento" placeholder="Complemento (opcional)" {...register("complemento")} fieldError={errors.complemento?.message} />

                                        <InputLabel labelTitulo="Bairro *" placeholder="Bairro" {...register("bairro")} fieldError={errors.bairro?.message} />

                                        <InputLabel labelTitulo="Cidade *" placeholder="Cidade" {...register("localidade")} fieldError={errors.localidade?.message} disabled />

                                        <InputLabel labelTitulo="Estado *" placeholder="UF" {...register("uf")} fieldError={errors.uf?.message} disabled />
                                    </div>
                                </div>}

                            {/* Step 3: Dados de Acesso */}
                            {currentStep === 3 && <div className="space-y-5 animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Lock className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground">Dados de Acesso</h2>
                                            <p className="text-sm text-muted-foreground">Credenciais para acessar sua conta</p>
                                        </div>
                                    </div>
                                    
                                    <InputLabel labelTitulo="E-mail *" type="email" placeholder="seu@email.com" {...register("email")} fieldError={errors.email?.message} />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputLabel labelTitulo="Senha *" type="password" placeholder="Digite sua senha" {...register("senha")} isPassword fieldError={errors.senha?.message} />

                                        <InputLabel labelTitulo="Confirmar Senha *" type="password" placeholder="Confirme sua senha" {...register("confirmarSenha")} isPassword fieldError={errors.confirmarSenha?.message} />
                                    </div>
                                </div>}

                            {/* Navigation Buttons */}
                            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                                {currentStep > 1 ? <ButtonComponent type="button" onClick={handlePrevious} className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Voltar
                                    </ButtonComponent> : <ButtonComponent type="button" onClick={() => navigate('/login')} className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                        Cancelar
                                    </ButtonComponent>}
                                
                                {currentStep < 3 ? <ButtonComponent type="button" onClick={handleNext} className="flex-1">
                                        Próximo
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </ButtonComponent> : <ButtonComponent type="submit" className="flex-1" disabled={isLoading}>
                                        <Check className="w-4 h-4 mr-1" />
                                        Criar Conta
                                    </ButtonComponent>}
                            </div>
                        </form>
                    </div>

                    {/* Link para Login */}
                    <div className="text-center mt-6">
                        <p className="text-muted-foreground text-sm">
                            Já possui uma conta?{' '}
                            <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">
                                Faça login aqui
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>;
};