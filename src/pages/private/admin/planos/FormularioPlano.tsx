import { Content } from "../../Content"
import { yupResolver } from "@hookform/resolvers/yup";
import { InputLabel } from "../../../../components/input-label"
import * as yup from "yup"
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { ButtonComponent } from "../../../../components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadSpinner } from "../../../../components/loading";
import { useNavigate, useParams } from "react-router-dom";
import type { IPlano } from "../../../../types/IPlano";
import { toast } from "sonner";
import { PlanoService } from "../../../../services/PlanoService";


const schamePlano = yup.object().shape({
    id: yup.string(),
    nome: yup.string().required("O nome do cliente é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
    percentualDesconto: yup.number().required("O percentual do plano é obrigatório"),
    descricao: yup.string(),
})

type FormDataPlano = yup.InferType<typeof schamePlano>
const FormularioPlano = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [planoId] = useParams().planoId ? [useParams().planoId] : [];
    const [isLoading, setIsLoading] = useState(false);
    const service = new PlanoService()
    const planos = queryClient.getQueryData<IPlano[]>(["planos"]);
    const plano = planos?.find(p => p.id === planoId);


    const planoStorage = localStorage.getItem("planoEdicao");
    const dadosLocalStorage = planoStorage ? JSON.parse(planoStorage) : undefined;

    const methods = useForm<FormDataPlano>({
        resolver: yupResolver(schamePlano),
        defaultValues: dadosLocalStorage,
    });

    const { register, handleSubmit, formState: { errors }, reset, clearErrors } = methods;

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataPlano) => {
            setIsLoading(true);
            const requestData = {
                id: inputViewModel.id ?? "",
                nome: inputViewModel.nome,
                percentualDesconto: inputViewModel.percentualDesconto,
                descricao: inputViewModel.descricao ?? "",
            }

            if (inputViewModel.id) {
                return service.update(inputViewModel.id, requestData);
            }

            return service.create(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            queryClient.invalidateQueries({ queryKey: ["planos"] });
            toast.success("Plano cadastrado com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            setIsLoading(false);
            console.error(error);
        },
    })

    const handlerOnSubmit = async (data: FormDataPlano) => {
        try {
            await mutation.mutateAsync(data);
            localStorage.removeItem("planoEdicao");
            reset();
            navigate("/admin/planos");
        } catch (error) {
            toast.error("Erro ao criar o plano. Tente novamente mais tarde.", { position: "top-center" });
        }
    }

    const handleCancel = () => {
        clearErrors();
        reset();
    }

    useEffect(() => {
        if (plano) {
            const dadosFormatados = {
                id: plano.id,
                nome: plano.nome,
                percentualDesconto: plano.percentual,
                descricao: plano.descricao
            };

            localStorage.setItem("planoEdicao", JSON.stringify(dadosFormatados));
            methods.reset(dadosFormatados); // carrega no form também
        } else {
            localStorage.removeItem("planoEdicao");
        }

    }, [plano]);

    return (isLoading ? <LoadSpinner mensagem="Aguarde, enviando informações do novo plano..." />
        : (
            <Content
                titulo={` ${planoId ? 'Editar' : 'Novo'} Plano`}
            >
                <FormProvider {...methods}>
                    <form className="bg-white w-full p-6 rounded-xl flex flex-col gap-4" onSubmit={handleSubmit(handlerOnSubmit)}>
                        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mt-6">

                            <div className="sm:col-span-8 col-span-12 w-full">
                                <InputLabel
                                    labelTitulo="Nome"
                                    type="text"
                                    placeholder="Digite o nome do plano"
                                    {...register("nome")}
                                    fieldError={errors.nome?.message}
                                />
                            </div>

                            <div className="sm:col-span-4 col-span-12 w-full">
                                <InputLabel
                                    type="number"
                                    labelTitulo="Percentual de desconto"
                                    {...register("percentualDesconto")}
                                    fieldError={errors?.percentualDesconto && errors?.percentualDesconto.message}
                                />
                                <small className="text-slate-400">Somente números</small>
                            </div>
                        </div>
                        <div className="col-span-4">
                            <InputLabel
                                labelTitulo="Descrição"
                                type="text"
                                placeholder="Digite a descrição do plano Ex: desconto de 15% apartir de 15k mensal"
                                {...register("descricao")}
                                fieldError={errors.descricao?.message}
                            />
                        </div>
                        <div className="flex flex-row gap-4 mt-6 w-full">
                            <ButtonComponent >Salvar</ButtonComponent>
                            <ButtonComponent border="outline" onClick={handleCancel} type="button">Limpar</ButtonComponent>
                        </div>
                    </form>
                </FormProvider>
            </Content>
        )
    )
}

export default FormularioPlano