import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LoadSpinner } from "../../../components/loading";
import { ButtonComponent } from "../../../components/button";
import { LogoApp } from "../../../components/logo";
import { InputLabel } from "../../../components/input-label";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as yup from 'yup'
import { CustomHttpClient } from "../../../utils/http-axios-client";

const schemaRecuperarSenha = yup.object({
    email: yup.string().required("Informe seu email.")
})

type FormDataRecuperarSenha = yup.InferType<typeof schemaRecuperarSenha>;

export const RecuperarSenha = () => {
    const navigator = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const clientHttp = new CustomHttpClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormDataRecuperarSenha>({
        resolver: yupResolver(schemaRecuperarSenha),
        defaultValues: {
            email: ''
        }
    });

    const onSubmit = async (data: FormDataRecuperarSenha) => {
        try {
            setIsLoading(true);
            const response = await clientHttp.post(`recuperar-senha`, { email: data.email });
            console.log(response);
            reset();
            sessionStorage.setItem('emailRecovery', data.email);
            navigator('/pin-code');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadSpinner />
    }

    return (
        <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 sm:px-6 items-center justify-end sm:justify-center gap-6 sm:bg-gray-50 bg-white">
            <div className="flex flex-col sm:items-center gap-2">
                <LogoApp />
                <div className="sm:text-center justify-start items-start gap-2">

                    <p className="text-[#475466] text-sm">Siga os passos para recuperar seu acesso</p>
                </div>
            </div>

            <div className="w-full sm:max-w-xl sm:p-10 bg-white sm:rounded-lg sm:border sm:border-zinc-200">
                <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4 sm:gap-6">
                    <div className="flex flex-col gap-1">
                        <InputLabel labelTitulo="Email" type="text" fieldError={errors.email?.message}
                            {...register("email")}
                        />
                    </div>
                    <div className="w-full justify-center items-center flex">
                        <ButtonComponent size="small">Recuperar senha</ButtonComponent>
                    </div>
                </form>
            </div>
            <div className="self-stretch justify-center items-center gap-1 inline-flex">
                <div className="text-[#1d2838] text-sm font-normal leading-[21px]">Já possui uma conta?</div>
                <div className="justify-start items-start flex">
                    <div className="justify-center items-center gap-2 flex">
                        <Link to={'/login'} className="text-[#156fee] text-sm font-medium underline leading-[21px]">Acesse aqui</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}