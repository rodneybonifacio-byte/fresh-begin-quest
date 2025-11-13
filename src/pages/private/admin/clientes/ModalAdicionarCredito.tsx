import { FormProvider, useForm } from 'react-hook-form';
import { InputLabel } from '../../../../components/input-label';
import { ModalCustom } from '../../../../components/modal';
import { ButtonComponent } from '../../../../components/button';
import { useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { formatCurrency, formatNumberString } from '../../../../utils/formatCurrency';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import type { ICliente } from '../../../../types/ICliente';
import { schemaCreditoCliente, type FormCreditoCliente } from '../../../../utils/schames/clientes';
import { ClienteService } from '../../../../services/ClienteService';
import { toastSuccess } from '../../../../utils/toastNotify';

interface ModalAdicionarCreditoProps {
    isOpen: boolean;
    data: ICliente;
    onClose: () => void;
}
export const ModalAdicionarCredito = ({ isOpen, data, onClose }: ModalAdicionarCreditoProps) => {
    const service = new ClienteService();
    const  queryClient = useQueryClient();
    const { setIsLoading } = useLoadingSpinner();
    const methods = useForm<FormCreditoCliente>({
        defaultValues: {
            clienteId: data.id,
        },
        resolver: yupResolver(schemaCreditoCliente),
    });
    const {
        register,
        setValue,
        handleSubmit,
        formState: { errors },
    } = methods;

    const mutation = useMutation({
        mutationFn: async (input: FormCreditoCliente) => {
            if (!data.id) {
                throw new Error('Cliente não encontrado.');
            }

            setIsLoading(true);
            const response = await service.adicionarCredito(data.id, input);
            return response;
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
            setValue('clienteId', data.id);
        }
    }, [data?.id, setValue]);

    const handleOnAddCreditos = async (data: FormCreditoCliente) => {
        try {
            await mutation.mutateAsync({
                ...data,
                valorCredito: formatNumberString(data.valorCredito),
            });
            toastSuccess('Crédito adicionado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            onClose();
        } catch (error) {
            console.error(error);
        }
    };
    useEffect(() => {}, [methods.formState.errors]);

    if (!isOpen) return null;

    return (
        <ModalCustom title="Adicionar Creditos" description={`adicionar credito para o cliente: ${data.nomeEmpresa}`} onCancel={onClose} size="small">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleOnAddCreditos)} className="flex flex-col gap-4">
                    <div className="flex flex-col w-full">
                        <InputLabel
                            labelTitulo="Valor"
                            type="text"
                            placeholder="0"
                            {...register('valorCredito', {
                                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                                    const valor = formatCurrency(e.target.value);
                                    setValue('valorCredito', valor);
                                },
                            })}
                            fieldError={errors.valorCredito?.message}
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
