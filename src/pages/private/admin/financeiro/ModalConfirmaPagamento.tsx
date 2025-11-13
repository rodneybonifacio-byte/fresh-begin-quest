import { FormProvider, useForm } from "react-hook-form";
import { InputLabel } from "../../../../components/input-label";
import { ModalCustom } from "../../../../components/modal";
import { formatCurrency, formatNumberString } from "../../../../utils/formatCurrency";
import { ButtonComponent } from "../../../../components/button";
import { getYesterday } from "../../../../utils/date-utils";
import { UploadArquivo } from "../../../../components/UploadArquivo";
import type { IFatura } from "../../../../types/IFatura";
import { schemaFaturaConfirmaPagamento, type FormFaturaConfirmaPagamento } from "../../../../utils/schames/fatura";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { FaturaService } from "../../../../services/FaturaService";
import { useEffect } from "react";

interface ModalConfirmaPagamentoProps {
    isOpen: boolean
    data: IFatura
    onClose: () => void
}

export const ModalConfirmaPagamento = ({ isOpen, data, onClose }: ModalConfirmaPagamentoProps) => {

    const { setIsLoading } = useLoadingSpinner();
    const service = new FaturaService();
    const queryClient = useQueryClient();

    const methods = useForm<FormFaturaConfirmaPagamento>({
        defaultValues: {
            id: data.id,
            valorPago: data.valorRestante
        },
        resolver: yupResolver(schemaFaturaConfirmaPagamento),
    });
    const { register, setValue, handleSubmit, formState: { errors } } = methods;

    const mutation = useMutation({
        mutationFn: async (input: FormFaturaConfirmaPagamento) => {

            if (!data.id) {
                throw new Error("ID do credencial não encontrado.");
            }
console.log(data);

            const formData = new FormData();
            formData.append("valorPago", input.valorPago);
            formData.append("dataPagamento", input.dataPagamento);
            formData.append("observacao", input.observacao?.trim() || "");
            formData.append("id", data.id);
            // adiciona faturaId se existir
            if (data.faturaId) formData.append("faturaId", data.faturaId);

            //verifica se existe arquivos para enviar
            if (input.arquivos?.length) {
                for (let i = 0; i < (input.arquivos?.length || 0); i++) {
                    formData.append("arquivos", input?.arquivos[i] as File);
                }
            }

            setIsLoading(true);
            const response = await service.confirmaPagamento(data.id, formData);
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["faturas", 1] });
            setIsLoading(false);
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        }
    });

    const handleArquivos = (arquivos: File[]) => {
        setValue("arquivos", arquivos);
    };

    const handleOnAddCreditos = async (data: FormFaturaConfirmaPagamento) => {
        try {
            await mutation.mutateAsync({
                ...data,
                valorPago: formatNumberString(data.valorPago),
            });
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (data?.id) {
            setValue("id", data.id);
            setValue("valorPago", formatCurrency(data.valorRestante));
        }
        // console.log("Form errors:", methods.formState.errors);
    }, [data?.id, setValue, methods.formState.errors]);

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Confirmação de Pagamento"
            description="Confirmação de pagamento de fatura manual"
            onCancel={onClose}
        >
            <FormProvider {...methods}>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit(handleOnAddCreditos)}>
                    <div className="flex flex-col w-full gap-2">
                        <InputLabel
                            labelTitulo="Valor"
                            type="text"
                            placeholder="0"
                            {...register("valorPago", {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const valor = formatCurrency(e.target.value);
                                    setValue("valorPago", valor);
                                },
                            })}
                            fieldError={errors.valorPago?.message}
                        />

                        <InputLabel
                            labelTitulo="Data Final:"
                            type="date"
                            value={getYesterday()}
                            {...register("dataPagamento", {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const data = e.target.value;
                                    setValue("dataPagamento", data);
                                },
                            })}
                            fieldError={errors.dataPagamento?.message}
                        />

                        <UploadArquivo
                            onChange={handleArquivos}
                            allowTypes={['pdf', 'png', 'jpg']}
                            multiple={false}
                            maxFiles={1}
                        />

                        <textarea
                            {...register("observacao", {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const text = e.target.value;
                                    setValue("observacao", text);
                                },
                            })}
                            className="w-full h-24 p-2 border border-gray-300 rounded-lg"
                            placeholder="Observação"
                        ></textarea>
                        <p className="text-red-500 text-sm">{errors.observacao?.message}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <ButtonComponent >Confirmar</ButtonComponent>
                    </div>
                </form>
            </FormProvider>
        </ModalCustom>

    );
};