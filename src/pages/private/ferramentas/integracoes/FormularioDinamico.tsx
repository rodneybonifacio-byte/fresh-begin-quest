import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { IntegracaoService } from '../../../../services/IntegracaoService';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';

type FormField = {
    label: string;
    name: string;
    type: 'input' | 'select';
    required?: boolean;
    description?: string;
    data?: { value: string; label: string }[];
};

export type FormSchema = {
    image?: string;
    conected?: boolean;
    descricao: string;
    plataforma: string;
    formulario: FormField[];
};

export const FormularioDinamico = ({ schema }: { schema: FormSchema }) => {
    const validationSchemaFields = schema.formulario.reduce((acc, field) => {
        acc[field.name] = field.required ? Yup.string().required(`${field.label} é obrigatório`) : Yup.string();
        return acc;
    }, {} as Record<string, any>);
    const { setIsLoading } = useLoadingSpinner();

    const service = new IntegracaoService();

    const validationSchema = Yup.object().shape(validationSchemaFields);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            setIsLoading(true);
            return service.create({ credenciais: { ...data }, plataforma: schema.plataforma });
        }, 
        onSuccess: (response) => {
            setIsLoading(false);
            // Mostrar webhook URL para o usuário copiar
            if (response.data?.webhookUrl) {
                alert(`Integração criada! Configure o webhook na sua ${schema.plataforma}:\n\n${response.data.webhookUrl}`);
            }
        },
        onError: (error: any) => {
            setIsLoading(false);
            console.error('Erro ao salvar integração:', error);
        }
    });

    const {
        handleSubmit,
        register,
        formState: { errors }
    } = useForm({
        resolver: yupResolver(validationSchema),
    });

    const onSubmit = (data: any) => {
        try {
            mutation.mutate(data);
        }
        catch (error) {
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                {schema.formulario.map((field) => (
                    <div key={field.name} className="flex flex-col">
                        <label className="text-slate-400 dark:text-slate-300 text-sm font-medium leading-5">{field.label}</label>

                        {field.type === 'input' && (
                            <input
                                {...register(field.name)}
                                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mt-1 focus-within:ring-1 focus-within:ring-primary"
                            />
                        )}

                        {field.type === 'select' && (
                            <select
                                {...register(field.name)}
                                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 mt-1"
                            >
                                <option value="">Selecione...</option>
                                {field.data?.map((opt: { value: string; label: string }) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {field.description && (
                            <span className="text-sm text-gray-500 mt-1">{field.description}</span>
                        )}

                        {errors[field.name] && (
                            <span className="text-sm text-red-600 mt-1">
                                {errors[field.name]?.message as string}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <button
                type="submit"
                className="bg-secondary text-white px-4 py-2 rounded-md"
            >
                Salvar
            </button>
            {mutation.isError && (
                <p className="text-red-500 text-sm mt-2">Erro ao salvar os dados.</p>
            )}
            {mutation.isSuccess && (
                <p className="text-green-600 text-sm mt-2">Dados salvos com sucesso!</p>
            )}
        </form>
    );
};
