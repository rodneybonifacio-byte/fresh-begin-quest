import { InputLabel } from "../../../components/input-label";
import { ModalCustom } from "../../../components/modal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ButtonComponent } from "../../../components/button";
import { DestinatarioService } from "../../../services/DestinatarioService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IDestinatario } from "../../../types/IDestinatario";
import { useLoadingSpinner } from "../../../providers/LoadingSpinnerContext";
import { toast } from "sonner";
import { useAddress } from "../../../hooks/useAddress";
import { formatCep, formatCpfCnpj } from "../../../utils/lib.formats";
import { useEffect } from "react";

const schemaDestinatario = yup.object().shape({
    id: yup.string().optional(),
    nome: yup.string().required("Nome obrigatório"),
    cpfCnpj: yup.string().required("CPF/CNPJ obrigatório"),
    documentoEstrangeiro: yup.string(),
    cep: yup.string().required("CEP obrigatório"),
    logradouro: yup.string().required("Endereço obrigatório"),
    numero: yup.string().required("Número obrigatório"),
    complemento: yup.string(),
    bairro: yup.string().required("Bairro obrigatório"),
    localidade: yup.string().required("Cidade obrigatória"),
    celular: yup.string(),
    uf: yup.string().required("Estado obrigatório"),
});


type FormDataDestinatario = yup.InferType<typeof schemaDestinatario>;

interface ModalCadastrarDestinatarioProps {
    isOpen: boolean;
    onCancel: () => void;
    destinatario?: IDestinatario;
}

export const ModalCadastrarDestinatario = ({
    isOpen,
    onCancel,
    destinatario
}: ModalCadastrarDestinatarioProps) => {

    const queryClient = useQueryClient();
    const { setIsLoading } = useLoadingSpinner()

    const { register, handleSubmit, formState: { errors }, reset, setValue, setFocus } = useForm<FormDataDestinatario>({
        resolver: yupResolver(schemaDestinatario),
        defaultValues: {
            id: destinatario?.id ?? "",
            nome: destinatario?.nome ?? "",
            cpfCnpj: destinatario?.cpfCnpj ?? "",
            cep: destinatario?.endereco?.cep ?? "",
            logradouro: destinatario?.endereco?.logradouro ?? "",
            numero: destinatario?.endereco?.numero ?? "",
            complemento: destinatario?.endereco?.complemento ?? "",
            bairro: destinatario?.endereco?.bairro ?? "",
            localidade: destinatario?.endereco?.localidade ?? "",
            uf: destinatario?.endereco?.uf ?? ""
        }
    });

    const { onBuscaCep } = useAddress();

    const service = new DestinatarioService();

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataDestinatario) => {

            const requestData: IDestinatario = {
                id: inputViewModel.id ?? "",
                nome: inputViewModel.nome,
                cpfCnpj: inputViewModel.cpfCnpj,
                celular: inputViewModel.celular ?? "",
                endereco: {
                    cep: inputViewModel.cep,
                    logradouro: inputViewModel.logradouro,
                    numero: inputViewModel.numero,
                    complemento: inputViewModel.complemento ?? "",
                    bairro: inputViewModel.bairro,
                    localidade: inputViewModel.localidade,
                    uf: inputViewModel.uf
                }
            }

            if (inputViewModel.id) {
                return service.update(inputViewModel.id, requestData);
            }

            return service.create(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            onCancel?.();
            queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
            toast.success("Destinatario cadastrado com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            setIsLoading(false);
            console.log(error);
        },
    })

    const onSubmit = async (data: FormDataDestinatario) => {
        setIsLoading(true);
        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {

        if (destinatario) {
            setFocus("nome");
            setValue("id", destinatario.id);
            reset({
                id: destinatario.id,
                nome: destinatario.nome,
                cpfCnpj: formatCpfCnpj(destinatario.cpfCnpj),
                cep: destinatario.endereco?.cep,
                logradouro: destinatario.endereco?.logradouro,
                numero: destinatario.endereco?.numero,
                complemento: destinatario.endereco?.complemento,
                bairro: destinatario.endereco?.bairro,
                localidade: destinatario.endereco?.localidade,
                uf: destinatario.endereco?.uf,
            });
        }
    }, [destinatario, reset]);


    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Cadastrar Destinatario"
            description="Cadastrar destinatario para envio de etiquetas."
            onCancel={onCancel}
        >
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col w-full gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="w-full col-span-3">
                            <InputLabel
                                type="text"
                                labelTitulo="Nome do Destinatario:"
                                {...register("nome")}
                                fieldError={errors.nome?.message}
                            />
                        </div>
                        <div className="w-full col-span-3">
                            <InputLabel
                                type="text"
                                labelTitulo="CPF/CNPJ:"
                                {...register("cpfCnpj", {
                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const valor = formatCpfCnpj(e.target.value);
                                        setValue("cpfCnpj", valor);
                                    }
                                })}
                                fieldError={errors.cpfCnpj?.message}
                            />
                        </div>
                    </div>


                    <div className="grid grid-cols-12 gap-4 pb-4">

                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="CEP"
                                {...register("cep", {
                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const valor = formatCep(e.target.value);
                                        setValue("cep", valor);
                                        //valida o cep com 8 caracteres e so podemos buscar o cep se o cep for valido e remover caracteres
                                        const responseAddress = await onBuscaCep(e.target.value, setIsLoading);

                                        if (responseAddress) {
                                            setValue("logradouro", responseAddress?.logradouro ?? "");
                                            setValue("bairro", responseAddress?.bairro ?? "");
                                            setValue("localidade", responseAddress?.localidade ?? "");
                                            setValue("uf", responseAddress?.uf ?? "");
                                            setFocus("numero");
                                        }
                                    },
                                })}

                                fieldError={errors.cep && errors.cep.message}
                            />
                        </div>
                        <div className="sm:col-span-6 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Rua"
                                {...register("logradouro")}
                                fieldError={errors.logradouro && errors.logradouro.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Numero"
                                {...register("numero")}
                                fieldError={errors.numero && errors.numero.message}
                            />
                        </div>
                        <div className="sm:col-span-12 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Complemento"
                                {...register("complemento")}
                                fieldError={errors.complemento && errors.complemento.message}
                            />
                        </div>
                        <div className="sm:col-span-4 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Bairro"
                                {...register("bairro")}
                                fieldError={errors.bairro && errors.bairro.message}
                            />
                        </div>
                        <div className="sm:col-span-4 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Cidade"
                                {...register("localidade")}
                                disabled
                                isDisabled
                                fieldError={errors.localidade && errors.localidade.message}
                            />
                        </div>
                        <div className="sm:col-span-4 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="UF"
                                {...register("uf")}
                                disabled
                                isDisabled
                                fieldError={errors.uf && errors.uf.message}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-10">
                        <ButtonComponent type="submit">Salvar</ButtonComponent>
                        <ButtonComponent border="outline" onClick={onCancel} type="button">
                            Cancelar
                        </ButtonComponent>
                    </div>
                </div>
            </form>
        </ModalCustom>
    );
};
