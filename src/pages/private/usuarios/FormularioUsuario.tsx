import { Content } from "../Content"
import { yupResolver } from "@hookform/resolvers/yup";
import { InputLabel } from "../../../components/input-label"
import * as yup from "yup"
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ButtonComponent } from "../../../components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadSpinner } from "../../../components/loading";
import { useParams } from "react-router-dom";
import { UsuarioService } from "../../../services/UsuarioService";
import type { IUsuario } from "../../../types/IUsuario";

const schameFormUsuario = yup.object().shape({
    nome: yup.string().required("O nome do usuario é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
    sobrenome: yup.string().required("O sobrenome é obrigatório").min(3, "O sobrenome deve ter pelo menos 3 caracteres"),
    email: yup.string().email("E-mail inválido").required("O email é obrigatório"),
    senha: yup.string().required("O senha é obrigatório").min(6, "A senha deve ter pelo menos 6 caracteres"),
    roleId: yup.string().required('Tem rastreio é obrigatório'),
})

type FormDataUsuario = yup.InferType<typeof schameFormUsuario>
export const FormularioUsuario = () => {
    const [usuarioId] = useParams().usuarioId ? [useParams().usuarioId] : [];
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const service = new UsuarioService()
    const usuarios = queryClient.getQueryData<IUsuario[]>(["usuarios"]);
    const usuario = usuarios?.find(p => p.id === usuarioId);

    const { register, handleSubmit, formState: { errors }, reset, clearErrors } = useForm<FormDataUsuario>({
        resolver: yupResolver(schameFormUsuario),
        defaultValues: {
            nome: usuario?.nome ?? '',
            sobrenome: usuario?.sobrenome ?? '',
            email: usuario?.email ?? '',
            senha: usuario ? '********' : '',
            roleId: usuario?.roleId ?? ''
        }
    })

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataUsuario) => {
            setIsLoading(true);
            const requestData = {
                id: "",
                nome: inputViewModel.nome,
                sobrenome: inputViewModel.sobrenome,
                email: inputViewModel.email,
                senha: inputViewModel.senha,
                status: "ativo",
                roleId: inputViewModel.roleId,
                criadoEm: new Date().toISOString(),
            }
            return service.create(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            queryClient.invalidateQueries({ queryKey: ["usuarios"] });
        },
        onError: (error) => {
            setIsLoading(false);
            console.error(error);
        },
    })

    const handlerOnSubmit = async (data: FormDataUsuario) => {
        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error) {
            console.error(error);
        }
    }

    const handleCancel = () => {
        clearErrors();
        reset();
    }
    
    return (isLoading ? <LoadSpinner mensagem="Aguarde, enviando informações do novo usuario..." />
        : (
            <Content
                titulo={` ${usuarioId ? 'Editar' : 'Novo'} Usuario`}
            >
                <form className="bg-white w-full p-6 rounded-xl flex flex-col gap-4" onSubmit={handleSubmit(handlerOnSubmit)}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="col-span-2">
                            <InputLabel
                                labelTitulo="Nome"
                                type="text"
                                placeholder="Digite o nome do usuario"
                                {...register("nome")}
                                fieldError={errors.nome?.message}
                            />
                        </div>
                        <div className="col-span-2">
                            <InputLabel
                                labelTitulo="Sobrenome"
                                type="text"
                                placeholder="Digite o sobrenome"
                                {...register("sobrenome")}
                                fieldError={errors.sobrenome?.message}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                        <div className="col-span-3">
                            <InputLabel
                                labelTitulo="Email"
                                type="email"
                                placeholder="Digite o email do usuario"
                                {...register("email")}
                                fieldError={errors.email?.message}
                            />
                        </div>
                        <div className="col-span-1">
                            <InputLabel
                                labelTitulo="Senha"
                                isPassword
                                type="password"
                                placeholder="Digite a senha"
                                {...register("senha")}
                                fieldError={errors.senha?.message}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-6">
                        <ButtonComponent >Salvar</ButtonComponent>
                        <ButtonComponent border="outline" onClick={handleCancel} type="button">Cancelar</ButtonComponent>
                    </div>
                </form>
            </Content>
        )
    )
}