import { useState } from "react";
import { InputLabel } from "../../../components/input-label";
import { ModalCustom } from "../../../components/modal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import SelectCustom from "../../../components/custom-select";
import { ButtonComponent } from "../../../components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmbalagemService } from "../../../services/EmbalagemService";
import { formatoObjeto, type FormatoObjeto, type IEmbalagem } from "../../../types/IEmbalagem";
import { useLoadingSpinner } from "../../../providers/LoadingSpinnerContext";

const schemaEmbalagem = yup.object().shape({
    tipoEmbalagem: yup.string().oneOf<FormatoObjeto>(["ENVELOPE", "CAIXA_PACOTE", "CILINDRO_ROLO"], "Tipo de embalagem inválido")
        .required("Selecione o tipo de embalagem"),
    descricao: yup.string().required("Descrição obrigatória"),
    altura: yup.string().when(["tipoEmbalagem"], (values, schema) => {
        const [tipo] = values as [FormatoObjeto];
        return tipo === "CAIXA_PACOTE" ? schema.required("Altura obrigatória") : schema.notRequired();
    }),
    largura: yup.string().when(["tipoEmbalagem"], (values, schema) => {
        const [tipo] = values as [FormatoObjeto];
        return tipo === "CAIXA_PACOTE" ? schema.required("Largura obrigatória") : schema.notRequired()
    }),
    comprimento: yup.string().when(["tipoEmbalagem"], (values, schema) => {
        const [tipo] = values as [FormatoObjeto];
        return tipo === "CAIXA_PACOTE" || tipo === "CILINDRO_ROLO" ? schema.required("Comprimento obrigatório") : schema.notRequired()
    }),
    diametro: yup.string().when(["tipoEmbalagem"], (values, schema) => {
        const [tipo] = values as [FormatoObjeto];
        return tipo === "CILINDRO_ROLO" ? schema.required("Diâmetro obrigatório") : schema.notRequired()
    }),
    peso: yup.string().required("Peso obrigatório"),
});

type FormDataEmbalagem = yup.InferType<typeof schemaEmbalagem>;

export const ModalNovaEmbalagem: React.FC<{ isOpen: boolean; onCancel: () => void }> = ({
    isOpen,
    onCancel,
}) => {
    const queryClient = useQueryClient();
    const { setIsLoading } = useLoadingSpinner()
    const [selectedTipoEmbalagem, setSelectedTipoEmbalagem] = useState<FormatoObjeto>("CAIXA_PACOTE"); 

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormDataEmbalagem>({
        resolver: yupResolver(schemaEmbalagem),
        defaultValues: { tipoEmbalagem: "CAIXA_PACOTE" },
    });

    const service = new EmbalagemService();

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataEmbalagem) => {

            const requestData: IEmbalagem = {
                id: "",
                descricao: inputViewModel.descricao,
                altura: Number(inputViewModel.altura),
                largura: Number(inputViewModel.largura),
                comprimento: Number(inputViewModel.comprimento),
                peso: Number(inputViewModel.peso),
                diametro: inputViewModel.diametro ? Number(inputViewModel.diametro) : 0,
                formatoObjeto: inputViewModel.tipoEmbalagem.toUpperCase() as FormatoObjeto,
            }
            return service.create(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            onCancel?.();
            queryClient.invalidateQueries({ queryKey: ["embalagens"] });
        },
        onError: (error) => {
            setIsLoading(false);
            console.log(error);
        },
    })

    const onSubmit = async (data: FormDataEmbalagem) => {
        setIsLoading(true);
        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error) {
            console.error(error);
        }
    }

    // Atualiza o valor de tipoEmbalagem no form quando o select muda
    const handleSelectChange = (value: string) => {
        const selectedValue = value as FormatoObjeto;
        setSelectedTipoEmbalagem(selectedValue);
        setValue("tipoEmbalagem", selectedValue);

        console.log(selectedValue);
    };

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Adicionar Embalagem"
            description="Adicione uma nova embalagem para o envio."
            onCancel={onCancel}
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <h2 className="text-2xl font-bold mb-4">Adicionar Embalagem</h2>
                <div className="flex flex-col w-full gap-4">
                    <div className="w-full">
                        <InputLabel
                            type="text"
                            labelTitulo="Descrição"
                            {...register("descricao")}
                            fieldError={errors.descricao?.message}
                        />
                    </div>

                    <div className="flex flex-col w-full">
                        <SelectCustom
                            label="Tipo de embalagem"
                            data={formatoObjeto}
                            valueSelected={selectedTipoEmbalagem}
                            onChange={handleSelectChange}
                            fieldError={errors.tipoEmbalagem?.message}
                        />
                        {errors.tipoEmbalagem?.message && (
                            <span className="text-red-500">{errors.tipoEmbalagem.message}</span>
                        )}
                    </div>

                    {selectedTipoEmbalagem === "CAIXA_PACOTE" && (
                        <>
                            <h1 className="font-semibold text-xl">Dimensões (cm):</h1>
                            <div className="grid grid-cols-3 gap-4 w-full">
                                <InputLabel
                                    labelTitulo="Altura:"
                                    type="text"
                                    placeholder="0"
                                    {...register("altura")}
                                    fieldError={errors.altura?.message}
                                />
                                <InputLabel
                                    labelTitulo="Largura:"
                                    type="text"
                                    placeholder="0"
                                    {...register("largura")}
                                    fieldError={errors.largura?.message}
                                />
                                <InputLabel
                                    labelTitulo="Comprimento:"
                                    type="text"
                                    placeholder="0"
                                    {...register("comprimento")}
                                    fieldError={errors.comprimento?.message}
                                />
                            </div>
                        </>
                    )}

                    {selectedTipoEmbalagem === "CILINDRO_ROLO" && (
                        <>
                            <h1 className="font-semibold text-xl">Dimensões (cm):</h1>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <InputLabel
                                    labelTitulo="Comprimento:"
                                    type="text"
                                    placeholder="0"
                                    {...register("comprimento")}
                                    fieldError={errors.comprimento?.message}
                                />
                                <InputLabel
                                    labelTitulo="Diâmetro:"
                                    type="text"
                                    placeholder="0"
                                    {...register("diametro")}
                                    fieldError={errors.diametro?.message}
                                />
                            </div>
                        </>
                    )}

                    <div className="w-full">
                        <InputLabel
                            labelTitulo="Peso:"
                            type="number"
                            placeholder="0"
                            {...register("peso")}
                            fieldError={errors.peso?.message}
                        />
                        <small>Peso padrão em gramas (embalagem + conteúdo)</small>
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
