import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ButtonComponent } from '../../../../../components/button';
import { InputLabel } from '../../../../../components/input-label';
import { ModalCustom } from '../../../../../components/modal';
import { useLoadingSpinner } from '../../../../../providers/LoadingSpinnerContext';
import { CorreriosService } from '../../../../../services/CorreriosService';
import type { ICorreiosCredencial } from '../../../../../types/ICorreiosCredencial';
import { formatCurrency, formatNumberString } from '../../../../../utils/formatCurrency';
import { schemaCorreiosAporte, type FormCorreiosAporte } from '../../../../../utils/schames/contratoCorreiosAporte';

interface ModalAdicionarAporteCreditoProps {
    isOpen: boolean;
    data: ICorreiosCredencial;
    onClose: () => void;
}
export const ModalAdicionarAporteCredito = ({ isOpen, data, onClose }: ModalAdicionarAporteCreditoProps) => {
    const service = new CorreriosService();
    const { setIsLoading } = useLoadingSpinner();
    const queryClient = useQueryClient();
    const methods = useForm<FormCorreiosAporte>({
        defaultValues: {
            idCredencial: data.id,
        },
        resolver: yupResolver(schemaCorreiosAporte),
    });
    const {
        register,
        setValue,
        handleSubmit,
        formState: { errors },
    } = methods;

    const mutation = useMutation({
        mutationFn: async (input: FormCorreiosAporte) => {
            if (!data.id) {
                throw new Error('ID do credencial não encontrado.');
            }

            setIsLoading(true);
            const response = await service.aplicarAporte(data.id, input);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes', 1] });
            setIsLoading(false);
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        },
    });

    useEffect(() => {
        if (data?.id) {
            setValue('idCredencial', data.id);
        }
    }, [data?.id, setValue]);

    const handleOnAddCreditos = async (data: FormCorreiosAporte) => {
        try {
            await mutation.mutateAsync({
                ...data,
                valorAporte: formatNumberString(data.valorAporte),
            });
            onClose();
        } catch (error) {
            console.error(error);
        }
    };
    useEffect(() => {
        console.log('Form errors:', methods.formState.errors);
    }, [methods.formState.errors]);

    if (!isOpen) return null;

    return (
        <ModalCustom title="Adicionar Creditos" description={'adicionar aportes de credito para o contrato de postagem'} onCancel={onClose}>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleOnAddCreditos)} className="flex flex-col gap-4">
                    <div className="flex flex-col w-full">
                        <InputLabel
                            labelTitulo="Valor"
                            type="text"
                            placeholder="0"
                            {...register('valorAporte', {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const valor = formatCurrency(e.target.value);
                                    setValue('valorAporte', valor);
                                },
                            })}
                            fieldError={errors.valorAporte?.message}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <ButtonComponent>Adicionar</ButtonComponent>
                    </div>
                </form>
            </FormProvider>
        </ModalCustom>
    );
};
