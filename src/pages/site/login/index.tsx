import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogoApp } from "../../../components/logo";
import * as yup from 'yup'
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup'
import { CustomHttpClient } from "../../../utils/http-axios-client";
import { ResponseLogin } from "../../../types/responseLogin";
import { toast } from "sonner";
import authStore from "../../../authentica/authentication.store";
import { LoadSpinner } from "../../../components/loading";
import { ButtonComponent } from "../../../components/button";
import { InputLabel } from "../../../components/input-label";
import { getRedirectPathByRole } from "../../../utils/auth.utils";
import { ThemeToggle } from "../../../components/theme/ThemeToggle";

const loginSchame = yup.object({
    email: yup.string().required("Informe seu email."),
    password: yup.string().required("Informa sua password.")
})

type LoginFormData = yup.InferType<typeof loginSchame>;

export const Login = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const clientHttp = new CustomHttpClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>({
        resolver: yupResolver(loginSchame)
    });
    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsLoading(true);
            const response = await clientHttp.post<ResponseLogin>(`login`, {
                email: data.email,
                password: data.password,
            });

            // Exemplo: Armazenar o token no localStorage
            if (response.token) {
                localStorage.setItem("token", response.token);
                authStore.login({ email: data.email, token: response.token })
                reset()

                const from = location.state?.from?.pathname + location.state?.from?.search || getRedirectPathByRole();
                navigate(from, { replace: true });
            } else {
                toast.error("Login falhou. Verifique suas credenciais.", { position: "top-center" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadSpinner mensagem="Aguarde, Autenticando suas credenciais..." />
    }

    return (
        <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 sm:px-6 items-center justify-end sm:justify-center gap-4 bg-white dark:bg-slate-900 relative">
            {/* Theme Toggle - Canto superior direito */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            
            <div className="w-full sm:max-w-xl sm:p-6 md:p-1">
                <div className="flex flex-col sm:items-center gap-2">
                    <LogoApp light/>
                    <div className="sm:text-center justify-start items-start gap-2">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Insira suas informações para acessar sua conta</p>
                    </div>
                </div>
            </div>

            <div className="w-full sm:max-w-xl sm:p-10 md:p-10 sm:bg-white dark:sm:bg-slate-800 sm:rounded-lg sm:border sm:border-zinc-200 dark:sm:border-slate-600">
                <div className="flex flex-col justify-start items-center sm:items-center gap-6">
                    {/* Formulário */}
                    <form method="POST" onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4 sm:gap-6">
                        <div className="flex flex-col gap-1">
                            <InputLabel labelTitulo="Email" type="text" autoComplete="username" fieldError={errors.email?.message}
                                {...register("email")}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <InputLabel type="password" autoComplete="current-password" labelTitulo="Senha" fieldError={errors.password?.message} isPassword={true}
                                {...register("password")}
                            />
                        </div>

                        {/* Permanecer conectado e Esqueci a password */}
                        <div className="self-stretch justify-between items-center inline-flex">
                            <div className="justify-start items-center gap-2 flex">
                                <div className="w-5 h-5 justify-center items-center flex">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 relative rounded-lg border-2 border-[#e3e4e8] dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                        id="rememberMe"
                                    />
                                </div>
                                <label htmlFor="rememberMe" className="text-[#1d2838] dark:text-slate-300 text-sm font-medium leading-tight cursor-pointer">
                                    Permanecer conectado
                                </label>
                            </div>

                            <div className="justify-center items-center gap-2 flex">
                                <Link to="/recuperar-senha" className="text-secondary dark:text-secondary-400 text-sm font-semibold leading-tight">
                                    Esqueci a password
                                </Link>
                            </div>
                        </div>

                        {/* Botão de Login */}
                        <div className="w-full justify-center items-center flex">
                            <ButtonComponent size="small">Login</ButtonComponent>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}