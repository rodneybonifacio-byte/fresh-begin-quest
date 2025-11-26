import { InputLabel } from "../../../components/input-label";
import { ModalCustom } from "../../../components/modal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingSpinner } from "../../../providers/LoadingSpinnerContext";
import { toast } from "sonner";
import { useAddress } from "../../../hooks/useAddress";
import { formatCep, formatCpfCnpj } from "../../../utils/lib.formats";
import { User, MapPin, Mail, Building2, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
const schemaRemetente = yup.object().shape({
  nome: yup.string().required("Nome obrigatório"),
  cpfCnpj: yup.string().required("CPF/CNPJ obrigatório"),
  documentoEstrangeiro: yup.string(),
  celular: yup.string(),
  telefone: yup.string(),
  email: yup.string().required("E-mail obrigatório").email("E-mail inválido"),
  cep: yup.string().required("CEP obrigatório"),
  logradouro: yup.string().required("Logradouro obrigatório"),
  numero: yup.string().required("Número obrigatório"),
  complemento: yup.string(),
  bairro: yup.string().required("Bairro obrigatório"),
  localidade: yup.string().required("Cidade obrigatória"),
  uf: yup.string().required("Estado obrigatório")
});
type FormDataRemetente = yup.InferType<typeof schemaRemetente>;
export const ModalCadastrarRemetente: React.FC<{
  isOpen: boolean;
  onCancel: () => void;
  showWelcomeMessage?: boolean;
}> = ({
  isOpen,
  onCancel,
  showWelcomeMessage = false
}) => {
  const queryClient = useQueryClient();
  const {
    setIsLoading
  } = useLoadingSpinner();
  const [currentStep, setCurrentStep] = useState(1);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    reset,
    setValue,
    setFocus
  } = useForm<FormDataRemetente>({
    resolver: yupResolver(schemaRemetente)
  });
  const {
    onBuscaCep
  } = useAddress();
  const steps = [{
    number: 1,
    title: 'Identificação',
    icon: Building2
  }, {
    number: 2,
    title: 'Endereço',
    icon: MapPin
  }, {
    number: 3,
    title: 'Contato',
    icon: Mail
  }];
  const mutation = useMutation({
    mutationFn: async (inputViewModel: FormDataRemetente) => {
      // Usar edge function para cadastro automático
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Obter token do usuário do localStorage
      const apiToken = localStorage.getItem('token');
      if (!apiToken) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/criar-remetente-autocadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          apiToken: apiToken,
          nome: inputViewModel.nome,
          cpfCnpj: inputViewModel.cpfCnpj,
          documentoEstrangeiro: inputViewModel.documentoEstrangeiro ?? "",
          celular: inputViewModel.celular ?? "",
          telefone: inputViewModel.telefone ?? "",
          email: inputViewModel.email,
          endereco: {
            cep: inputViewModel.cep,
            logradouro: inputViewModel.logradouro,
            numero: inputViewModel.numero,
            complemento: inputViewModel.complemento ?? "",
            bairro: inputViewModel.bairro,
            localidade: inputViewModel.localidade,
            uf: inputViewModel.uf
          }
        })
      });
      const responseData = await response.json();
      if (!response.ok) {
        // Verificar se é erro de CPF/CNPJ duplicado
        if (response.status === 409 || responseData.error?.toLowerCase().includes('já cadastrado')) {
          throw new Error('Este CPF/CNPJ já está cadastrado no sistema.');
        }
        throw new Error(responseData.error || 'Erro ao cadastrar remetente');
      }
      return responseData;
    },
    onSuccess: () => {
      setIsLoading(false);
      queryClient.invalidateQueries({
        queryKey: ["remetentes"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dados-usuario-completos"]
      });
      toast.success("Remetente cadastrado com sucesso!", {
        duration: 5000,
        position: "top-center"
      });
      reset();
      setCurrentStep(1);
      onCancel?.();
    },
    onError: error => {
      setIsLoading(false);
      console.error('Erro ao cadastrar remetente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao cadastrar remetente';
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-center"
      });
    }
  });
  const onSubmit = async (data: FormDataRemetente) => {
    setIsLoading(true);
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error(error);
    }
  };
  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  if (!isOpen) return null;
  return <ModalCustom title="" description="" onCancel={onCancel}>

            <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                {/* Header Moderno */}
                <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-xl lg:text-2xl font-bold text-foreground">Adicionar Remetente</h2>
                    </div>
                    <p className="text-sm text-muted-foreground ml-12">
                        Preencha os dados do endereço de origem que aparecerá nas etiquetas
                    </p>
                </div>

                {/* Timeline/Stepper */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {/* Progress Bar Background */}
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10" />
                        <div className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 ease-out -z-10" style={{
            width: `${(currentStep - 1) / (steps.length - 1) * 100}%`
          }} />
                        
                        {steps.map(step => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return <div key={step.number} className="flex flex-col items-center flex-1 first:items-start last:items-end">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isCompleted ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50' : isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg' : 'bg-muted text-muted-foreground'}`}>
                                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                    </div>
                                    <span className={`text-xs font-medium text-center transition-colors duration-300 ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {step.title}
                                    </span>
                                </div>;
          })}
                    </div>
                </div>

                {showWelcomeMessage && currentStep === 1 && <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-xl p-4 lg:p-5 mb-6 shadow-sm animate-fade-in">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div className="space-y-2 flex-1 min-w-0">
                                <h3 className="font-bold text-foreground text-base lg:text-lg">Bem-vindo ao BRHUB Envios!</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Para começar a emitir etiquetas, você precisa cadastrar pelo menos <strong className="text-foreground">um remetente</strong>. 
                                    O remetente é o endereço de origem dos seus envios e <strong className="text-foreground">essas informações aparecerão nas etiquetas impressas</strong>.
                                </p>
                                <div className="flex items-center gap-2 text-xs text-primary font-medium pt-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Preencha os dados abaixo para continuar
                                </div>
                            </div>
                        </div>
                    </div>}
                
                {/* Step 1: Identificação */}
                {currentStep === 1 && <div className="space-y-4 mb-6 animate-fade-in">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Building2 className="h-4 w-4 text-primary" />
                            Identificação
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="w-full">
                                <InputLabel type="text" labelTitulo="CPF/CNPJ" placeholder="000.000.000-00" {...register("cpfCnpj", {
              onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                const valor = formatCpfCnpj(e.target.value);
                setValue("cpfCnpj", valor);
              }
            })} fieldError={errors.cpfCnpj?.message} />
                            </div>

                            <div className="w-full">
                                <InputLabel type="text" labelTitulo="Nome do Remetente" placeholder="Nome completo ou razão social" {...register("nome")} fieldError={errors.nome?.message} />
                            </div>
                        </div>
                    </div>}

                {/* Step 2: Endereço */}
                {currentStep === 2 && <div className="space-y-4 mb-6 animate-fade-in">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            Endereço
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-3">
                                <InputLabel type="text" labelTitulo="CEP" placeholder="00000-000" {...register("cep", {
              onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                const valor = formatCep(e.target.value);
                setValue("cep", valor);
                const responseAddress = await onBuscaCep(e.target.value, setIsLoading);
                if (responseAddress) {
                  setValue("logradouro", responseAddress?.logradouro ?? "");
                  setValue("bairro", responseAddress?.bairro ?? "");
                  setValue("localidade", responseAddress?.localidade ?? "");
                  setValue("uf", responseAddress?.uf ?? "");
                  setFocus("numero");
                }
              }
            })} fieldError={errors.cep?.message} />
                            </div>
                            
                            <div className="lg:col-span-6">
                                <InputLabel type="text" labelTitulo="Logradouro" placeholder="Rua, avenida..." {...register("logradouro")} fieldError={errors.logradouro?.message} />
                            </div>
                            
                            <div className="lg:col-span-3">
                                <InputLabel type="text" labelTitulo="Número" placeholder="123" {...register("numero")} fieldError={errors.numero?.message} />
                            </div>
                            
                            <div className="lg:col-span-12">
                                <InputLabel type="text" labelTitulo="Complemento" placeholder="Apto, sala, bloco... (opcional)" {...register("complemento")} fieldError={errors.complemento?.message} />
                            </div>
                            
                            <div className="lg:col-span-4">
                                <InputLabel type="text" labelTitulo="Bairro" placeholder="Bairro" {...register("bairro")} fieldError={errors.bairro?.message} />
                            </div>
                            
                            <div className="lg:col-span-6">
                                <InputLabel type="text" labelTitulo="Cidade" placeholder="Cidade" {...register("localidade")} disabled isDisabled fieldError={errors.localidade?.message} />
                            </div>
                            
                            <div className="lg:col-span-2">
                                <InputLabel type="text" labelTitulo="UF" placeholder="UF" {...register("uf")} disabled isDisabled fieldError={errors.uf?.message} />
                            </div>
                        </div>
                    </div>}

                {/* Step 3: Contato */}
                {currentStep === 3 && <div className="space-y-4 mb-8 animate-fade-in">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Mail className="h-4 w-4 text-primary" />
                            Contato
                        </div>
                        
                        <div className="w-full">
                            <InputLabel type="email" labelTitulo="E-mail" placeholder="seu@email.com" {...register("email")} fieldError={errors.email?.message} />
                        </div>
                    </div>}

                {/* Ações */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
                    {currentStep === 1 && <>
                            <button type="button" onClick={onCancel} className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors duration-200">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleNext} className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-slate-50">
                                Próximo
                                <CheckCircle2 className="h-5 w-5" />
                            </button>
                        </>}
                    
                    {currentStep === 2 && <>
                            <button type="button" onClick={handlePrevious} className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors duration-200">
                                Voltar
                            </button>
                            <button type="button" onClick={handleNext} className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2">
                                Próximo
                                <CheckCircle2 className="h-5 w-5" />
                            </button>
                        </>}
                    
                    {currentStep === 3 && <>
                            <button type="button" onClick={handlePrevious} className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors duration-200">
                                Voltar
                            </button>
                            <button type="submit" className="flex-1 min-h-[44px] px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Salvar Remetente
                            </button>
                        </>}
                </div>
            </form>
        </ModalCustom>;
};