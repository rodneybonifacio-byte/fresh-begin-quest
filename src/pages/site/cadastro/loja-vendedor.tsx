import { useState } from "react";
import { InputLabel } from "../../../components/input-label";
import { MessageComponent } from "../../../components/message";
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CustomHttpClient } from "../../../utils/http-axios-client";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { mask, unMask } from "remask";
import { CardCadastroLoginCustom } from "../../../components/card-cadastro-login";
import { LoadSpinner } from "../../../components/loading";

type TipoCadastro = 'vendedor' | 'lojista'
type CadastroFormData = yup.InferType<typeof cadastroSchame>;

const cadastroSchame = yup.object().shape({
    tipoCadastro: yup.string(),
    nome: yup.string().min(8, 'Por favor, digite seu nome completo').required('Nome é obrigatório'),
    cnpj: yup.string()
        .when('tipoCadastro', (tipoCadastro) => {
            console.log(tipoCadastro);
            
            return tipoCadastro[0] === 'lojista'
                ? yup.string().required('O CNPJ é obrigatório para logistas')
                : yup.string();
        }),
    email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
    telefone: yup.string().required('Telefone é obrigatório'),
    senha: yup.string().min(6, 'A senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
    confirma_senha: yup.string().required('Confirmação de senha é obrigatória').oneOf([yup.ref('senha'), ""], 'Senhas não conferem'),
}).required();

interface TipoCadastroProps {
    tipoCadastro: TipoCadastro
}

export const CadastroLogistaVendedor = ({ tipoCadastro }: TipoCadastroProps) => {
    const [phone, setPhone] = useState('');
    const clientHttp = new CustomHttpClient();
    const { register, handleSubmit, formState: { errors }, reset } = useForm<CadastroFormData>({
        resolver: yupResolver(cadastroSchame),
        defaultValues: {
            nome: '',
            cnpj: '',
            email: '',
            telefone: '',
            senha: '',
            confirma_senha: '',
            tipoCadastro: tipoCadastro
        }
    })
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const mutation = useMutation({
        mutationFn: async (data: CadastroFormData) => {
            setIsLoading(true);
            const response = await clientHttp.post(`${import.meta.env.VITE_BASE_API_URL}/cadastro`, data);
            return response
        },
        onSuccess: () => {
            setIsSuccess(true);
            setIsLoading(false);
        },
        onError: (error) => {
            throw error;
        }
    });

    const onSubmit = async (data: CadastroFormData) => {

        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error: any) {
            setIsLoading(false);

            if (error instanceof AxiosError && error.response?.data?.errors) {
                const apiErrors = error.response.data.errors;

                // Coleta todos os erros em uma lista
                const errorMessages = Object.values(apiErrors).flat();
                console.error(errorMessages);
            } else if (error instanceof Error) {
                toast.error(error.message, { position: "top-center" });
            } else {
                toast.error("Erro inesperado. Tente novamente mais tarde.", { position: "top-center" });
            }
        }

    }

    if (isLoading) {
        return <LoadSpinner />
    }

    const handleMaskPhone = (e: any) => {
        const originalValue = unMask(e.target.value);
        const result = mask(originalValue, ['(99) 9999-9999', '(99) 9 9999-9999'])
        setPhone(result)
    }


    return (
        isSuccess ? (<MessageComponent
            titulo="Agora sim!"
            subTitulo="Seu cadastro foi realizado com sucesso! Comece agora a vender seu automóvel e receba as melhores ofertas por ele."
            labelButton="Acessar sistema"
            toBack="/login" />
        ) : (
            <CardCadastroLoginCustom>
                <div className="w-full sm:max-w-xl sm:p-10 md:p-10 bg-white sm:rounded-lg sm:border sm:border-zinc-200">
                    <div className="flex flex-col justify-start items-center sm:items-center gap-6">
                        {/* Formulário */}
                        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>

                            <InputLabel labelTitulo={`Nome Completo ${tipoCadastro && tipoCadastro === "lojista" ? 'da loja' : ''}`} type="text" {...register("nome")} fieldError={errors.nome && errors.nome.message} />

                            {tipoCadastro && tipoCadastro === "lojista" && (
                                <InputLabel labelTitulo="CNPJ" type="text" {...register("cnpj")} fieldError={errors.cnpj && errors.cnpj.message} />
                            )}

                            <InputLabel labelTitulo="Email" type="text" {...register("email")} fieldError={errors.email && errors.email.message} typeSize="email" />

                            <InputLabel
                                labelTitulo="Telefone"
                                type="text"
                                inputMode="numeric"
                                placeholder="Ex. (xx) 9xxxx-xxxx"
                                {...register("telefone")}
                                fieldError={errors.telefone && errors.telefone.message}
                                onChange={handleMaskPhone}
                                value={phone}
                            />

                            <InputLabel
                                labelTitulo="Senha"
                                autoComplete="current-password"
                                {...register("senha")}
                                fieldError={errors.senha && errors.senha.message}
                                isPassword={true}
                            />

                            <InputLabel
                                labelTitulo="Confirmar Senha"
                                autoComplete="current-password"
                                {...register("confirma_senha")}
                                fieldError={errors.confirma_senha && errors.confirma_senha.message}
                                isPassword={true}
                            />

                            {/* Botão de Cadastrar */}
                            <div className="w-full">
                                <button className="h-12 w-full bg-blue-600 text-white text-sm font-medium rounded-lg flex justify-center items-center">
                                    Criar acesso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </CardCadastroLoginCustom>
        )
    )
}