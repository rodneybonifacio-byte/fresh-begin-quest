import { InputLabel } from "../../../components/input-label";
import { ModalCustom } from "../../../components/modal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ButtonComponent } from "../../../components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingSpinner } from "../../../providers/LoadingSpinnerContext";
import { toast } from "sonner";
import { useAddress } from "../../../hooks/useAddress";
import { formatCep, formatCpfCnpj } from "../../../utils/lib.formats";

const schemaRemetente = yup.object().shape({
    nome: yup.string().required("Nome obrigatório"),
    cpfCnpj: yup.string().required("CPF/CNPJ obrigatório"),
    documentoEstrangeiro: yup.string(),
    celular: yup.string(),
    telefone: yup.string(),
    email: yup.string().required("E-mail obrigatório").email("E-mail inválido"),
    cep: yup.string().required("CEP obrigatório"),
    logradouro: yup.string().required("Logradouro obrigatório"),
    numero: yup.string().required("Número obrigatório"),
    complemento: yup.string(),
    bairro: yup.string().required("Bairro obrigatório"),
    localidade: yup.string().required("Cidade obrigatória"),
    uf: yup.string().required("Estado obrigatório"),
});


type FormDataRemetente = yup.InferType<typeof schemaRemetente>;

export const ModalCadastrarRemetente: React.FC<{ isOpen: boolean; onCancel: () => void }> = ({
    isOpen,
    onCancel,
}) => {
    const queryClient = useQueryClient();
    const { setIsLoading } = useLoadingSpinner()

    const { register, handleSubmit, formState: { errors }, reset, setValue, setFocus } = useForm<FormDataRemetente>({
        resolver: yupResolver(schemaRemetente)
    });
    const { onBuscaCep } = useAddress();

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataRemetente) => {
            // Usar edge function para cadastro automático
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            
            const response = await fetch(`${supabaseUrl}/functions/v1/criar-remetente-autocadastro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                    nome: inputViewModel.nome,
                    cpfCnpj: inputViewModel.cpfCnpj,
                    documentoEstrangeiro: inputViewModel.documentoEstrangeiro ?? "",
                    celular: inputViewModel.celular ?? "",
                    telefone: inputViewModel.telefone ?? "",
                    email: inputViewModel.email,
                    endereco: {
                        cep: inputViewModel.cep,
                        logradouro: inputViewModel.logradouro,
                        numero: inputViewModel.numero,
                        complemento: inputViewModel.complemento ?? "",
                        bairro: inputViewModel.bairro,
                        localidade: inputViewModel.localidade,
                        uf: inputViewModel.uf
                    }
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                // Verificar se é erro de CPF/CNPJ duplicado
                if (response.status === 409 || responseData.error?.toLowerCase().includes('já cadastrado')) {
                    throw new Error('Este CPF/CNPJ já está cadastrado no sistema.');
                }
                throw new Error(responseData.error || 'Erro ao cadastrar remetente');
            }

            return responseData;
        },
        onSuccess: () => {
            setIsLoading(false);
            onCancel?.();
            queryClient.invalidateQueries({ queryKey: ["remetentes"] });
            toast.success("Remetente cadastrado com sucesso!", { duration: 5000, position: "top-center" });
        },
        onError: (error) => {
            setIsLoading(false);
            console.error('Erro ao cadastrar remetente:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro ao cadastrar remetente';
            toast.error(errorMessage, { duration: 5000, position: "top-center" });
        },
    })

    const onSubmit = async (data: FormDataRemetente) => {
        setIsLoading(true);
        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error) {
            console.error(error);
        }
    }

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Cadastrar Remetente"
            description="Preencha os dados do remetente para continuar com a emissão da etiqueta."
            onCancel={onCancel}>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                <h2 className="text-2xl font-bold mb-4">Adicionar Remetente</h2>
                <div className="flex flex-col w-full gap-2">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

                        <div className="w-full col-span-3">
                            <InputLabel
                                type="text"
                                labelTitulo="Nome do Remetente:"
                                {...register("nome")}
                                fieldError={errors.nome?.message}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">

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

                    <div className="w-full">
                        <InputLabel
                            type="text"
                            labelTitulo="E-mail:"
                            {...register("email")}
                            fieldError={errors.email?.message}
                        />
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
