import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { LogoApp } from "../../../components/logo";
import { InputLabel } from "../../../components/input-label";
import { ButtonComponent } from "../../../components/button";
import { LoadSpinner } from "../../../components/loading";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";
import { useAddress } from "../../../hooks/useAddress";
import { supabase } from "../../../integrations/supabase/client";

const schemaCadastroCliente = yup.object().shape({
    nomeEmpresa: yup.string().required("O nome da empresa é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
    nomeResponsavel: yup.string().required("O nome do responsável é obrigatório").min(3, "O nome do responsável deve ter pelo menos 3 caracteres"),
    cpfCnpj: yup.string().required("O CPF/CNPJ é obrigatório"),
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
    confirmarSenha: yup.string()
        .required("Confirme a senha")
        .oneOf([yup.ref('senha')], "As senhas não coincidem"),
});

type CadastroClienteFormData = yup.InferType<typeof schemaCadastroCliente>;

export const CadastroCliente = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const { onBuscaCep } = useAddress();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        setFocus,
        clearErrors,
    } = useForm<CadastroClienteFormData>({
        resolver: yupResolver(schemaCadastroCliente),
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

    const onSubmit = async (data: CadastroClienteFormData) => {
        try {
            setIsLoading(true);

            // Chamar edge function para criar o cliente com todas as configurações
            const { error } = await supabase.functions.invoke('criar-cliente-autocadastro', {
                body: {
                    nomeEmpresa: data.nomeEmpresa,
                    nomeResponsavel: data.nomeResponsavel,
                    cpfCnpj: data.cpfCnpj,
                    telefone: data.telefone || '',
                    celular: data.celular,
                    endereco: {
                        cep: data.cep,
                        logradouro: data.logradouro,
                        numero: data.numero,
                        complemento: data.complemento || '',
                        bairro: data.bairro,
                        localidade: data.localidade,
                        uf: data.uf,
                    },
                    email: data.email,
                    senha: data.senha,
                },
            });

            if (error) {
                console.error('Erro ao criar cliente:', error);
                
                // Tentar extrair mensagem de erro mais específica
                let errorMessage = 'Erro ao criar conta. Tente novamente.';
                
                try {
                    // O erro pode vir com a mensagem completa ou dentro de uma propriedade
                    const errorText = error.message || JSON.stringify(error);
                    
                    // Verificar se é erro de CPF/CNPJ duplicado
                    if (errorText.includes('Já existe um cliente cadastrado com o mesmo CPF/CNPJ') || 
                        errorText.includes('ERR-MZJZG9')) {
                        errorMessage = 'Este CPF/CNPJ já está cadastrado. Se você já tem uma conta, faça login.';
                        
                        // Mostrar toast com link para login
                        toast.error(errorMessage, {
                            duration: 5000,
                            action: {
                                label: 'Ir para Login',
                                onClick: () => navigate('/login', { state: { email: data.email } })
                            }
                        });
                        return;
                    }
                    
                    // Tentar parsear JSON se houver
                    if (errorText.includes('{')) {
                        const match = errorText.match(/\{[^}]+\}/);
                        if (match) {
                            const parsed = JSON.parse(match[0]);
                            if (parsed.error) {
                                errorMessage = parsed.error;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Erro ao processar mensagem de erro:', e);
                }
                
                toast.error(errorMessage);
                return;
            }

            toast.success('Conta criada com sucesso! Redirecionando para o login...', {
                duration: 3000,
            });

            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                navigate('/login', {
                    state: { email: data.email, mensagem: 'Conta criada com sucesso! Faça login para continuar.' }
                });
            }, 2000);

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

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/10 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
            
            {/* Cadastro Card */}
            <div className="w-full max-w-3xl relative z-10 animate-fade-in">
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                        <LogoApp light />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-foreground mb-2">Criar Conta</h1>
                        <p className="text-muted-foreground text-sm">Preencha os dados abaixo para começar a usar o BRHUB Envios</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                        {/* Dados da Empresa */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                Dados da Empresa
                            </h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <InputLabel
                                        labelTitulo="Nome / Razão Social"
                                        placeholder="Digite o nome da empresa"
                                        {...register("nomeEmpresa")}
                                        fieldError={errors.nomeEmpresa?.message}
                                    />
                                </div>
                                
                                <div className="sm:col-span-2">
                                    <InputLabel
                                        labelTitulo="Nome do Responsável"
                                        placeholder="Digite o nome do responsável"
                                        {...register("nomeResponsavel")}
                                        fieldError={errors.nomeResponsavel?.message}
                                    />
                                </div>

                                <InputLabel
                                    labelTitulo="CPF/CNPJ"
                                    placeholder="Digite o CPF ou CNPJ"
                                    {...register("cpfCnpj")}
                                    fieldError={errors.cpfCnpj?.message}
                                />

                                <InputLabel
                                    labelTitulo="Telefone"
                                    placeholder="(00) 0000-0000"
                                    {...register("telefone")}
                                    fieldError={errors.telefone?.message}
                                />

                                <InputLabel
                                    labelTitulo="Celular *"
                                    placeholder="(00) 00000-0000"
                                    {...register("celular")}
                                    fieldError={errors.celular?.message}
                                />
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                Endereço
                            </h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputLabel
                                    labelTitulo="CEP"
                                    placeholder="00000-000"
                                    {...register("cep")}
                                    fieldError={errors.cep?.message}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setValue('cep', value);
                                        handleCepChange(value);
                                    }}
                                />

                                <InputLabel
                                    labelTitulo="Rua"
                                    placeholder="Digite o logradouro"
                                    {...register("logradouro")}
                                    fieldError={errors.logradouro?.message}
                                />

                                <InputLabel
                                    labelTitulo="Número"
                                    placeholder="Número"
                                    {...register("numero")}
                                    fieldError={errors.numero?.message}
                                />

                                <InputLabel
                                    labelTitulo="Complemento"
                                    placeholder="Complemento (opcional)"
                                    {...register("complemento")}
                                    fieldError={errors.complemento?.message}
                                />

                                <InputLabel
                                    labelTitulo="Bairro"
                                    placeholder="Bairro"
                                    {...register("bairro")}
                                    fieldError={errors.bairro?.message}
                                />

                                <InputLabel
                                    labelTitulo="Cidade"
                                    placeholder="Cidade"
                                    {...register("localidade")}
                                    fieldError={errors.localidade?.message}
                                    disabled
                                />

                                <InputLabel
                                    labelTitulo="Estado"
                                    placeholder="UF"
                                    {...register("uf")}
                                    fieldError={errors.uf?.message}
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Dados de Acesso */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                                Dados de Acesso
                            </h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <InputLabel
                                        labelTitulo="E-mail"
                                        type="email"
                                        placeholder="seu@email.com"
                                        {...register("email")}
                                        fieldError={errors.email?.message}
                                    />
                                </div>

                                <InputLabel
                                    labelTitulo="Senha"
                                    type="password"
                                    placeholder="Digite sua senha"
                                    {...register("senha")}
                                    isPassword
                                    fieldError={errors.senha?.message}
                                />

                                <InputLabel
                                    labelTitulo="Confirmar Senha"
                                    type="password"
                                    placeholder="Confirme sua senha"
                                    {...register("confirmarSenha")}
                                    isPassword
                                    fieldError={errors.confirmarSenha?.message}
                                />
                            </div>
                        </div>

                        {/* Botões */}
                        <div className="flex gap-3 pt-4">
                            <ButtonComponent
                                type="button"
                                onClick={() => navigate('/login')}
                                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                            >
                                Voltar
                            </ButtonComponent>
                            <ButtonComponent
                                type="submit"
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Criar Conta
                            </ButtonComponent>
                        </div>
                    </form>
                </div>

                {/* Link para Login */}
                <div className="text-center mt-6">
                    <p className="text-muted-foreground text-sm">
                        Já possui uma conta?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-primary font-medium hover:underline"
                        >
                            Faça login aqui
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
