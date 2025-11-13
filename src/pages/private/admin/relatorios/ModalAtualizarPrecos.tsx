import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { ButtonComponent } from '../../../../components/button';
import { InputLabel } from '../../../../components/input-label';
import { ModalCustom } from '../../../../components/modal';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { EmissaoService } from '../../../../services/EmissaoService';
import type { IEmissao } from '../../../../types/IEmissao';
import { formatCurrency, formatNumberString } from '../../../../utils/formatCurrency';

// Schema específico para atualização de preços
const schemaAtualizarPrecos = yup.object().shape({
    emissaoId: yup.string().required('Emissão não encontrada'),
    tipoAtualizacao: yup.string().oneOf(['VALOR_VENDA', 'VALOR_CUSTO']).required('Selecione o tipo de atualização'),
    valor: yup.string(),
});

type FormAtualizarPrecos = yup.InferType<typeof schemaAtualizarPrecos>;

interface ModalAtualizarPrecosProps {
    isOpen: boolean;
    data: IEmissao;
    onClose: () => void;
}
export const ModalAtualizarPrecos = ({ isOpen, data, onClose }: ModalAtualizarPrecosProps) => {
    const { setIsLoading } = useLoadingSpinner();
    const queryClient = useQueryClient();
    const service = new EmissaoService();

    const methods = useForm<FormAtualizarPrecos>({
        defaultValues: {
            emissaoId: data.id,
            tipoAtualizacao: 'VALOR_VENDA',
            valor: '',
        },
        resolver: yupResolver(schemaAtualizarPrecos),
    });
    const {
        register,
        setValue,
        handleSubmit,
        formState: { errors },
    } = methods;

    const mutation = useMutation({
        mutationFn: async (input: FormAtualizarPrecos) => {
            if (!data.id) {
                throw new Error('Emissão não encontrada.');
            }

            setIsLoading(true);

            // atualizar preços
            const inputnew = {
                emissaoId: input.emissaoId,
                tipoAtualizacao: input.tipoAtualizacao,
                valor: formatNumberString(input.valor || ''),
            };

            const response = await service.atualizarPrecos(data.id, inputnew);
            // invalidar cache
            queryClient.invalidateQueries({ queryKey: ['emissoes'] });
            return { success: true, response };
        },
        onSuccess: () => {
            setIsLoading(false);
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        },
    });

    useEffect(() => {
        if (data?.id) {
            setValue('emissaoId', data.id);
        }
    }, [data?.id, setValue]);

    const handleOnAtualizarPrecos = async (formData: FormAtualizarPrecos) => {
        try {
            await mutation.mutateAsync(formData);
            onClose();
        } catch (error) {
            onClose();
            console.error(error);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalCustom title="Atualizar Preços" description={`Atualizar preços para Envio: ${data.codigoObjeto}`} onCancel={onClose} size="small">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleOnAtualizarPrecos)} className="flex flex-col gap-4">
                    {/* Tipo de atualização */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">O que deseja atualizar?</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="VALOR_VENDA"
                                    {...register('tipoAtualizacao')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Venda</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="VALOR_CUSTO"
                                    {...register('tipoAtualizacao')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Custo <small>(valor postagem)</small>
                                </span>
                            </label>
                        </div>
                        {errors.tipoAtualizacao && <span className="text-sm text-red-600">{errors.tipoAtualizacao.message}</span>}
                    </div>

                    {/* Campo de valor */}
                    <div className="flex flex-col w-full">
                        <InputLabel
                            labelTitulo={'Valor (R$)'}
                            type="text"
                            placeholder="0,00"
                            {...register('valor', {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const valor = formatCurrency(e.target.value);
                                    setValue('valor', valor);
                                },
                            })}
                            fieldError={errors.valor?.message}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <ButtonComponent type="submit">Atualizar</ButtonComponent>
                    </div>
                </form>
            </FormProvider>
        </ModalCustom>
    );
};
