import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { ButtonComponent } from '../../../../components/button';
import { InputLabel } from '../../../../components/input-label';
import SelectCustom from '../../../../components/SelectCustom';
import { Content } from '../../Content';
import { useMutation } from '@tanstack/react-query';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { TransportadoraService } from '../../../../services/TransportadoraService';
import { toast } from 'sonner';

type AuthType = 'API_KEY' | 'OAUTH2' | 'BASIC_AUTH';

const schameTransportadora = yup.object().shape({
    id: yup.string().optional(),
    nome: yup.string().required('O nome é obrigatório'),
    tipoAutenticacao: yup.string().oneOf<AuthType>(['API_KEY', 'OAUTH2', 'BASIC_AUTH']).default('BASIC_AUTH'),
    status: yup.string().oneOf(['ATIVO', 'INATIVO']).default('ATIVO'),
});

const predefinedAuthTypes = [
    { label: 'API Key', value: 'API_KEY' },
    { label: 'OAuth2', value: 'OAUTH2' },
    { label: 'Basic Auth', value: 'BASIC_AUTH' },
];

type FormTransportadora = yup.InferType<typeof schameTransportadora>;

const FormularioTransportadora = () => {
    const { setIsLoading } = useLoadingSpinner();
    const service = new TransportadoraService();
    const methods = useForm<FormTransportadora>({
        resolver: yupResolver(schameTransportadora),
        defaultValues: {},
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
        clearErrors,
    } = methods;

    const handleCancel = () => {
        clearErrors();
        reset();
    };

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormTransportadora) => {
            setIsLoading(true);
            return service.create(inputViewModel);
        },
        onSuccess: () => setIsLoading(false),
        onError: (_error) => {
            setIsLoading(false);
            toast.error('Objeto não encontrado.', { position: 'top-center' });
        },
    });

    const handlerOnSubmit = (data: FormTransportadora) => {
        try {
            mutation.mutate(data);
            toast.success('Transportadora criada com sucesso!', { duration: 4000 });
            reset();
        } catch (_error) {}
    };
    return (
        <Content titulo="Nova Transportadora">
            <FormProvider {...methods}>
                <form
                    className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 w-full p-6 gap-4 space-y-4 rounded-xl"
                    onSubmit={handleSubmit(handlerOnSubmit)}
                >
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mt-6">
                        <div className="col-span-12">
                            <InputLabel
                                labelTitulo="Nome"
                                type="text"
                                placeholder="Digite o nome da transportadora"
                                {...register('nome')}
                                fieldError={errors.nome?.message}
                            />
                        </div>

                        <div className="col-span-3">
                            <SelectCustom
                                label="Tipo de Autenticação"
                                data={predefinedAuthTypes}
                                valueSelected={watch('tipoAutenticacao')}
                                onChange={(val) => setValue('tipoAutenticacao', val as AuthType)}
                                fieldError={errors.tipoAutenticacao?.message}
                            />
                        </div>

                        <div className="col-span-3">
                            <SelectCustom
                                label="Status"
                                data={[
                                    { label: 'Ativo', value: 'ATIVO' },
                                    { label: 'Inativo', value: 'INATIVO' },
                                ]}
                                valueSelected={watch('status')}
                                onChange={(val) => setValue('status', val as 'ATIVO' | 'INATIVO')}
                                fieldError={errors.status?.message}
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

export default FormularioTransportadora;
