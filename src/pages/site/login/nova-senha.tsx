import { useState, useEffect } from "react";
import { MessageComponent } from "../../../components/message";
import { LoadSpinner } from "../../../components/loading";
import { LogoApp } from "../../../components/logo";
import { ButtonComponent } from "../../../components/button";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../integrations/supabase/client";

const schema = yup.object({
    password: yup.string().required("Nova senha obrigatória").min(8, "Mínimo 8 caracteres"),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password')], 'As senhas devem ser iguais')
        .required('Confirmação obrigatória')
}).required();

type FormData = yup.InferType<typeof schema>;

export const NovaSenhaPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: yupResolver(schema)
    });

    useEffect(() => {
        // Verifica se há uma sessão válida (usuário clicou no link do email)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setHasValidSession(true);
            } else {
                toast.error("Link inválido ou expirado. Solicite um novo link de recuperação.");
                setTimeout(() => navigate("/recuperar-senha"), 2000);
            }
        });
    }, [navigate]);

    const handlerSubmit = async (data: FormData) => {
        try {
            setIsLoading(true);

            const { error } = await supabase.auth.updateUser({
                password: data.password
            });

            if (error) {
                toast.error("Erro ao alterar senha: " + error.message);
                return;
            }

            toast.success("Senha alterada com sucesso!");
            setIsSuccess(true);
            
            // Faz logout para forçar login com nova senha
            await supabase.auth.signOut();
            
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (error) {
            console.error("Erro ao criar nova senha:", error);
            toast.error("Erro ao processar solicitação");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || !hasValidSession) {
        return <LoadSpinner />
    }

    return (
        isSuccess ? (<MessageComponent
            titulo="Agora sim!"
            subTitulo="Sua nova senha foi criada com sucesso! Retorne ao login para acessar o sistema."
            labelButton="Acessar sistema"
            toBack="/login" />
        ) : (


            <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 sm:px-6 items-center justify-end sm:justify-center gap-8 sm:bg-gray-50 bg-white">


                <div className="flex flex-col sm:items-center gap-2">
                    <LogoApp />
                    <div className="sm:text-center justify-start items-start gap-2">

                        <p className="text-[#475466] text-sm">
                            Crie uma nova senha. Não esqueça de adicionar um caracter maiúsculo, <br />números e caracteres especiais.
                        </p>
                    </div>
                </div>
                <div className="w-full sm:max-w-xl sm:p-10 md:p-10 bg-white sm:rounded-lg sm:border sm:border-zinc-200">
                    <form onSubmit={handleSubmit(handlerSubmit)} className="flex flex-col justify-start items-center sm:items-center gap-6">
                        {/* Formulário */}
                        <div className="w-full flex flex-col gap-4 sm:gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-800 text-sm font-medium">Nova senha</label>
                                <input
                                    type="password"
                                    {...register("password")}
                                    className="h-14 p-4 bg-white rounded-md border border-zinc-200 text-gray-500 text-sm"
                                />
                                {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-800 text-sm font-medium">Repetir nova senha</label>
                                <input
                                    type="password"
                                    {...register("confirmPassword")}
                                    className="h-14 p-4 bg-white rounded-md border border-zinc-200 text-gray-500 text-sm"
                                />
                                {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword.message}</span>}
                            </div>

                            {/* Botão de Login */}
                            <div className="w-full justify-center items-center flex">
                                <ButtonComponent size="small">Criar nova senha</ButtonComponent>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        )
    )
}