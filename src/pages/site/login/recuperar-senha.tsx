import { Link } from "react-router-dom";
import { useState } from "react";
import { LoadSpinner } from "../../../components/loading";
import { ButtonComponent } from "../../../components/button";
import { LogoApp } from "../../../components/logo";
import { InputLabel } from "../../../components/input-label";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as yup from 'yup'
import { supabase } from "../../../integrations/supabase/client";
import { toast } from "sonner";

const schemaRecuperarSenha = yup.object({
    email: yup.string().email("Email inválido").required("Informe seu email.")
})

type FormDataRecuperarSenha = yup.InferType<typeof schemaRecuperarSenha>;

export const RecuperarSenha = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [emailEnviado, setEmailEnviado] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormDataRecuperarSenha>({
        resolver: yupResolver(schemaRecuperarSenha),
        defaultValues: {
            email: ''
        }
    });

    const onSubmit = async (data: FormDataRecuperarSenha) => {
        try {
            setIsLoading(true);
            const redirectUrl = `${window.location.origin}/nova-senha`;
            
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: redirectUrl,
            });

            if (error) {
                toast.error("Erro ao enviar email de recuperação: " + error.message);
                return;
            }

            toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
            setEmailEnviado(true);
            reset();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar solicitação");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadSpinner />
    }

    if (emailEnviado) {
        return (
            <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 px-6 items-center justify-center gap-8 bg-white sm:bg-gray-50">
                <div className="w-full max-w-xl p-4 md:p-10 bg-white rounded-lg sm:border sm:border-zinc-200">
                    <div className="flex flex-col justify-start items-center gap-8">
                        <div className="flex flex-col gap-6">
                            <span className="text-center text-slate-800 text-2xl font-light leading-[28.80px]">Verifique seu e-mail!</span>
                            <span className="text-center text-slate-600 text-sm font-normal leading-[21px]">
                                Enviamos um link de recuperação para seu email.<br />
                                Clique no link para criar uma nova senha.
                            </span>
                        </div>
                        <div className="w-full">
                            <Link to="/login" className="h-12 w-full bg-secondary text-white text-sm font-medium rounded-lg flex justify-center items-center hover:bg-secondary/90 transition-colors">
                                Voltar ao login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 sm:px-6 items-center justify-end sm:justify-center gap-6 sm:bg-gray-50 bg-white">
            <div className="flex flex-col sm:items-center gap-2">
                <LogoApp />
                <div className="sm:text-center justify-start items-start gap-2">
                    <p className="text-[#475466] text-sm">Informe seu email para recuperar seu acesso</p>
                </div>
            </div>

            <div className="w-full sm:max-w-xl sm:p-10 bg-white sm:rounded-lg sm:border sm:border-zinc-200">
                <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4 sm:gap-6">
                    <div className="flex flex-col gap-1">
                        <InputLabel 
                            labelTitulo="Email" 
                            type="email" 
                            fieldError={errors.email?.message}
                            {...register("email")}
                        />
                    </div>
                    <div className="w-full justify-center items-center flex">
                        <ButtonComponent size="small" disabled={isLoading}>
                            {isLoading ? "Enviando..." : "Recuperar senha"}
                        </ButtonComponent>
                    </div>
                </form>
            </div>
            <div className="self-stretch justify-center items-center gap-1 inline-flex">
                <div className="text-[#1d2838] text-sm font-normal leading-[21px]">Já possui uma conta?</div>
                <div className="justify-start items-start flex">
                    <div className="justify-center items-center gap-2 flex">
                        <Link to="/login" className="text-[#156fee] text-sm font-medium underline leading-[21px]">Acesse aqui</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}