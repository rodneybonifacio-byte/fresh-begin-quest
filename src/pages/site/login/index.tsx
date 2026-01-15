// Login Page Component
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogoApp } from "../../../components/logo";
import * as yup from 'yup';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { CustomHttpClient } from "../../../utils/http-axios-client";
import { ResponseLogin } from "../../../types/responseLogin";
import { toast } from "sonner";
import authStore from "../../../authentica/authentication.store";
import { LoadSpinner } from "../../../components/loading";
import { ButtonComponent } from "../../../components/button";
import { InputLabel } from "../../../components/input-label";
import { getRedirectPathByRole } from "../../../utils/auth.utils";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";
import { RemetenteSupabaseDirectService } from "../../../services/RemetenteSupabaseDirectService";
import { PromoBannerRecarga } from "../../../components/PromoBannerRecarga";
import { supabase } from "../../../integrations/supabase/client";
import type { TokenPayload } from "../../../types/ITokenPayload";
import { InstallAppButtons } from "../../../components/InstallAppButtons";
import { PublicTrackingWidget } from "../../../components/public/PublicTrackingWidget";

const loginSchame = yup.object({
  email: yup.string().required("Informe seu email."),
  password: yup.string().required("Informa sua password.")
});
type LoginFormData = yup.InferType<typeof loginSchame>;
export const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const clientHttp = new CustomHttpClient();
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    reset
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchame)
  });
  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const response = await clientHttp.post<ResponseLogin>(`login`, {
        email: data.email,
        password: data.password
      });

      // Limpa token antigo antes de setar o novo
      if (response.token) {
        localStorage.removeItem("token");
        localStorage.setItem("token", response.token);
        authStore.login({
          email: data.email,
          token: response.token
        });
        reset();

        // Registrar acesso/login - aguardar um momento para o token estar no localStorage
        try {
          const user = authStore.getUser() as TokenPayload | null;
          console.log('📝 Registrando acesso para:', user);
          
          if (user?.clienteId) {
            const registroResponse = await supabase.functions.invoke('registrar-acesso', {
              body: {
                clienteId: user.clienteId,
                userEmail: user.email || data.email,
                userName: user.name || data.email,
                action: 'login',
              },
            });
            console.log('✅ Acesso registrado:', registroResponse);
          } else {
            console.warn('⚠️ clienteId não encontrado no token:', user);
          }
        } catch (err) {
          console.error('❌ Erro ao registrar acesso:', err);
        }
        
        // Verificar se deve redirecionar para cadastro de remetente (fluxo de autocadastro)
        const shouldRedirectToRemetenteFlag = localStorage.getItem('redirect_to_remetente') === 'true';
        
        if (shouldRedirectToRemetenteFlag) {
          localStorage.removeItem('redirect_to_remetente');
          navigate('/app/remetentes?from=autocadastro', {
            replace: true
          });
          return;
        }

        // Verificar via backend se o usuário já possui remetentes cadastrados
        const remetenteService = new RemetenteSupabaseDirectService();
        let hasRemetentes = true;

        try {
          const responseRemetentes = await remetenteService.getAll();
          const lista = responseRemetentes?.data ?? [];
          hasRemetentes = lista.length > 0;
        } catch (err) {
          console.error('Erro ao buscar remetentes diretos para verificar cadastro:', err);
          // Em caso de erro, NÃO forçamos o fluxo de cadastro para não atrapalhar quem já tem remetente
          hasRemetentes = true;
        }

        if (!hasRemetentes) {
          navigate('/app/remetentes?from=autocadastro', {
            replace: true
          });
        } else {
          const from = location.state?.from?.pathname + location.state?.from?.search || getRedirectPathByRole();
          navigate(from, {
            replace: true
          });
        }
      } else {
        toast.error("Login falhou. Verifique suas credenciais.", {
          position: "top-center"
        });
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error("Tempo limite de conexão excedido. Verifique sua conexão ou tente novamente mais tarde.", {
          position: "top-center",
          duration: 5000
        });
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        toast.error("Erro de conexão. Verifique sua internet ou se o servidor está acessível.", {
          position: "top-center",
          duration: 5000
        });
      } else if (error.response?.status === 401) {
        toast.error("Email ou senha incorretos.", {
          position: "top-center"
        });
      } else if (error.message?.includes('interno do servidor') || error.response?.status === 500) {
        toast.error("Servidor temporariamente indisponível. Tente novamente em alguns minutos.", {
          position: "top-center",
          duration: 5000
        });
      } else {
        toast.error(error.message || "Erro ao fazer login. Tente novamente.", {
          position: "top-center"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return <LoadSpinner mensagem="Aguarde, Autenticando suas credenciais..." />;
  }
  return <>
        <PromoBannerRecarga variant="featured" />
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/10 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
            
            {/* Login Card */}
            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                        <LogoApp light />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta</h1>
                        <p className="text-muted-foreground text-sm">Insira suas credenciais para continuar</p>
                    </div>
                </div>

                {/* Widget de Rastreamento Público - No topo */}
                <div className="mb-6 w-full">
                    <div className="text-center mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground">📦 Rastreie sua encomenda</h3>
                    </div>
                    <PublicTrackingWidget />
                </div>

                {/* Form Card */}
                <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
                    <form method="POST" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                        <div className="space-y-4">
                            <InputLabel labelTitulo="Email" type="email" autoComplete="username" fieldError={errors.email?.message} {...register("email")} />
                            
                            <InputLabel labelTitulo="Senha" type="password" autoComplete="current-password" fieldError={errors.password?.message} isPassword={true} {...register("password")} />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 transition-colors" id="rememberMe" />
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Lembrar-me</span>
                            </label>
                            <Link to="/recuperar-senha" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                Esqueceu a senha?
                            </Link>
                        </div>

                        <ButtonComponent type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
                            Entrar
                        </ButtonComponent>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="text-center mb-4">
                            <span className="text-sm text-muted-foreground">Novo por aqui?</span>
                        </div>
                        
                        <ButtonComponent 
                            type="button"
                            onClick={() => navigate('/cadastro-cliente')}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                        >
                            Criar Conta
                        </ButtonComponent>
                    </div>

                    {/* Botões de instalação do app */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <InstallAppButtons />
                    </div>
                </div>

            </div>
        </div>
    </>;
};

export default Login;