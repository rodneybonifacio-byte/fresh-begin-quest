import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as yup from 'yup';
import { ButtonComponent } from '../../../../components/button';
import { InputLabel } from '../../../../components/input-label';
import SelectCustom from '../../../../components/SelectCustom';
import { SwitchToggle } from '../../../../components/SwitchToggle';
import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { JobService } from '../../../../services/JobService';
import { Content } from '../../Content';

// Frequências sugeridas
const predefinedFrequencies = [
    { label: 'A cada 5 minutos', value: '*/5 * * * *' },
    { label: 'A cada 15 minutos', value: '*/15 * * * *' },
    { label: 'A cada hora', value: '0 * * * *' },
    { label: 'Todo dia às 8h', value: '0 8 * * *' },
    { label: 'Toda segunda às 10h', value: '0 10 * * 1' },
    { label: 'Mensal no dia 1 às 0h', value: '0 0 1 * *' },
    { label: 'Customizar...', value: 'custom' },
];

// Validação com Yup
const schemaFormJob = yup.object().shape({
    name: yup.string().required('Nome é obrigatório'),
    command: yup.string().required('Comando é obrigatório'),
    frequency: yup.string().required('Frequência é obrigatória'),
    cronExpression: yup.string().when('frequency', {
        is: 'custom',
        then: (schema) =>
            schema.required('Expressão CRON personalizada é obrigatória').matches(/^(((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*|\*) ?){5}$/, 'Expressão CRON inválida'),
        otherwise: (schema) => schema.notRequired(),
    }),
    isActive: yup.boolean(),
});

type FormSchemaDataJob = yup.InferType<typeof schemaFormJob>;

const CronJobForm = () => {
    const { setIsLoading } = useLoadingSpinner();
    const { id } = useParams();
    const methods = useForm<FormSchemaDataJob>({
        resolver: yupResolver(schemaFormJob),
        defaultValues: {} as FormSchemaDataJob,
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = methods;

    const service = new JobService();
    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormSchemaDataJob) => {
            setIsLoading(true);

            const cronExpression = inputViewModel.frequency === 'custom' ? inputViewModel.cronExpression! : inputViewModel.frequency;
            const dataInput = {
                name: inputViewModel.name,
                command: inputViewModel.command,
                cronExpression,
                isActive: inputViewModel.isActive || false,
            };

            return service.create(dataInput);
        },
        onSuccess: () => setIsLoading(false),
        onError: (_error) => {
            setIsLoading(false);
            toast.error('Objeto não encontrado.', { position: 'top-center' });
        },
    });

    const { data: job } = useFetchQuery(
        ['job', id],
        async () => {
            return await service.getById(id ?? '');
        },
        { enabled: !!id, retry: false }
    );

    const frequency = watch('frequency');
    const isCustom = frequency === 'custom';

    const handleFormSubmit = async (data: FormSchemaDataJob) => {
        try {
            await mutation.mutateAsync(data);
            reset();
        } catch (error) {
            // Lida com erros se necessário
        }
    };

    useEffect(() => {
        if (job?.data) {
            reset(job.data);
        }
        console.log(methods.formState.errors);
    }, [job]);

    return (
        <Content titulo="Formulário de Job CRON" subTitulo="Crie e gerencie tarefas agendadas no sistema.">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 w-full p-6 gap-4 space-y-4 rounded-xl">
                        <InputLabel labelTitulo="Nome do Job" placeholder="Ex: Enviar relatórios" {...register('name')} fieldError={errors.name?.message} />
                        <InputLabel labelTitulo="Comando" placeholder="Ex: /app/processa.sh" {...register('command')} fieldError={errors.command?.message} />
                        <div className="flex flex-col gap-2">
                            <SelectCustom
                                label="Frequência"
                                data={predefinedFrequencies}
                                valueSelected={watch('frequency')}
                                onChange={(val) => setValue('frequency', val as string)}
                                fieldError={errors.frequency?.message}
                            />
                        </div>
                        {isCustom && (
                            <InputLabel
                                labelTitulo="Expressão CRON personalizada"
                                placeholder="Ex: */2 * * * *"
                                {...register('cronExpression')}
                                fieldError={errors.cronExpression?.message}
                                ref={null}
                            />
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-200">Ativo?</span>
                            <SwitchToggle defaultValue={true} onChange={(value) => setValue('isActive', value)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-10">
                            <ButtonComponent>
                                <Save /> Salvar
                            </ButtonComponent>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </Content>
    );
};

export default CronJobForm;
