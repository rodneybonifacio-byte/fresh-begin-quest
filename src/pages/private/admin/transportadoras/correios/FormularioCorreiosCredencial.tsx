import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as yup from 'yup';
import { ButtonComponent } from '../../../../../components/button';
import { InputLabel } from '../../../../../components/input-label';
import { LoadSpinner } from '../../../../../components/loading';
import { CorreriosService } from '../../../../../services/CorreriosService';
import type { ICorreiosCredencial } from '../../../../../types/ICorreiosCredencial';
import { Content } from '../../../../Content';

const schameCorreiosCredencial = yup.object().shape({
    id: yup.string().optional(),
    descricao: yup.string().required('O descricao é obrigatório'),
    usuario: yup.string().required('O usuario é obrigatório'),
    codigoAcesso: yup.string().required('O codigo de acesso é obrigatório'),
    cartaoPostagem: yup.string().required('O cartao de postagem é obrigatório'),
    contrato: yup.string().optional(),
});

type FormDataCredencial = yup.InferType<typeof schameCorreiosCredencial>;
const FormularioCorreiosCredencial = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [credencialId] = useParams().correiosCredenciaisId ? [useParams().correiosCredenciaisId] : [];
    const [isLoading, setIsLoading] = useState(false);
    const service = new CorreriosService();
    const credencials = queryClient.getQueryData<ICorreiosCredencial[]>(['credenciais']);
    const credencial = credencials?.find((p) => p.id === credencialId);

    const credencialStorage = localStorage.getItem('credencialEdicao');
    const dadosLocalStorage = credencialStorage ? JSON.parse(credencialStorage) : undefined;

    const methods = useForm<FormDataCredencial>({
        resolver: yupResolver(schameCorreiosCredencial),
        defaultValues: dadosLocalStorage ?? {
            id: '',
            descricao: '',
            usuario: '',
            codigoAcesso: '',
            cartaoPostagem: '',
            contrato: '',
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        clearErrors,
    } = methods;

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataCredencial) => {
            setIsLoading(true);
            const requestData = {
                id: inputViewModel.id ?? '',
                descricao: inputViewModel.descricao,
                usuario: inputViewModel.usuario,
                codigoAcesso: inputViewModel.codigoAcesso,
                cartaoPostagem: inputViewModel.cartaoPostagem,
                contrato: inputViewModel.contrato ?? '',
            };

            if (inputViewModel.id && inputViewModel.id.trim() !== '') {
                return service.updateCredencial(requestData, inputViewModel.id);
            }

            return service.createCredencial(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            queryClient.invalidateQueries({ queryKey: ['credenciais'] });
            toast.success('Credencial cadastrado com sucesso!', { duration: 5000, position: 'top-center' });
        },
        onError: (error) => {
            setIsLoading(false);
            console.error(error);
        },
    });

    useEffect(() => {
        console.log('Form errors:', methods.formState.errors);
    }, [methods.formState.errors]);

    const handlerOnSubmit = async (data: FormDataCredencial) => {
        try {
            await mutation.mutateAsync(data);
            localStorage.removeItem('credencialEdicao');
            reset();
            navigate('/admin/correios/credenciais');
        } catch (error) {
            toast.error('Erro ao criar o credencial. Tente novamente mais tarde.', { position: 'top-center' });
        }
    };

    const handleCancel = () => {
        clearErrors();
        reset();
    };

    useEffect(() => {
        if (credencial) {
            const dadosFormatados = {
                id: credencial.id ?? '',
                descricao: credencial.descricao ?? '',
                usuario: credencial.usuario ?? '',
                codigoAcesso: credencial.codigoAcesso ?? '',
                cartaoPostagem: credencial.cartaoPostagem ?? '',
                contrato: credencial.contrato ?? '',
            };

            localStorage.setItem('credencialEdicao', JSON.stringify(dadosFormatados));
            methods.reset(dadosFormatados); // carrega no form também
        } else {
            localStorage.removeItem('credencialEdicao');
        }
    }, [credencial]);

    return isLoading ? (
        <LoadSpinner mensagem="Aguarde, enviando informações do novo Credencial..." />
    ) : (
        <Content titulo={` ${credencialId ? 'Editar' : 'Nova'} Credencial de Correios`}>
            <FormProvider {...methods}>
                <form className="bg-white w-full p-6 rounded-xl flex flex-col gap-4" onSubmit={handleSubmit(handlerOnSubmit)}>
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mt-6">
                        <div className="col-span-12">
                            <InputLabel
                                labelTitulo="Descrição"
                                type="text"
                                placeholder="Digite a descrição para a credencial"
                                {...register('descricao')}
                                fieldError={errors.descricao?.message}
                            />
                        </div>

                        <div className="col-span-3">
                            <InputLabel
                                labelTitulo="Usuario Correios"
                                type="text"
                                placeholder="Digite o usuario dos correios"
                                {...register('usuario')}
                                fieldError={errors.usuario?.message}
                            />
                        </div>

                        <div className="col-span-3">
                            <InputLabel
                                labelTitulo="Codigo de acesso"
                                type="text"
                                placeholder="Digite o codigo de acesso"
                                {...register('codigoAcesso')}
                                fieldError={errors.codigoAcesso?.message}
                            />
                        </div>
                        <div className="col-span-3">
                            <InputLabel
                                labelTitulo="Cartão de postagem"
                                type="text"
                                placeholder="Digite o contrato"
                                {...register('cartaoPostagem')}
                                fieldError={errors.cartaoPostagem?.message}
                            />
                        </div>
                        <div className="col-span-3">
                            <InputLabel
                                labelTitulo="Contrato"
                                type="text"
                                placeholder="Digite o contrato"
                                {...register('contrato')}
                                fieldError={errors.contrato?.message}
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-4 mt-6 w-full">
                        <ButtonComponent type="submit">Salvar</ButtonComponent>
                        <ButtonComponent border="outline" onClick={handleCancel} type="button">
                            Limpar
                        </ButtonComponent>
                    </div>
                </form>
            </FormProvider>
        </Content>
    );
};

export default FormularioCorreiosCredencial;
