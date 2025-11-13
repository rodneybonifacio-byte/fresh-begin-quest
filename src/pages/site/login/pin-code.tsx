import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from 'yup';
import { ButtonComponent } from "../../../components/button";
import { PinCodeInputComponent } from "../../../components/PinCodeInputComponent";
import { LoadSpinner } from "../../../components/loading";
import { CustomHttpClient } from "../../../utils/http-axios-client";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const pinValidationSchema = yup.object().shape({
    pin: yup.string().required('O código é obrigatório.').matches(/^\d{6}$/, 'O código deve conter exatamente 6 dígitos.'),
    email: yup.string().required('O e-mail é obrigatório.').email('Formato de e-mail inválido.')
});

export type PinFormData = yup.InferType<typeof pinValidationSchema>;

export const PinCode = () => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const methods = useForm<PinFormData>({
        resolver: yupResolver(pinValidationSchema),
        defaultValues: {
            pin: '',
            email: sessionStorage.getItem('emailRecovery') || ''
        }
    });

    const { handleSubmit, formState: { errors } } = methods;

    const clientHttp = new CustomHttpClient();

    const onSubmit = async (data: PinFormData) => {
        try {
            setIsLoading(true);
            const response = await clientHttp.post(`recover/validate-pin`, data);
            sessionStorage.removeItem('emailRecovery');
            sessionStorage.setItem('tokenReset', JSON.stringify(response));
            navigate("/nova-senha");
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <LoadSpinner />;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="w-full h-screen p-6 flex flex-col pt-8 pb-12 py-2 sm:px-6 items-center justify-end sm:justify-center gap-6 sm:bg-gray-50 bg-white">
                    <div className="flex flex-col sm:items-center gap-2">
                        <div className="sm:mx-auto sm:w-full sm:max-w-md">
                            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                                Código de Verificação
                            </h2>
                            <p className="mt-2 text-center text-sm text-gray-600">
                                Enviamos um código de 6 dígitos para seu email
                            </p>
                        </div>

                        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Digite o código
                                            </label>
                                            <a href="#" className="text-sm font-medium text-secondary hover:text-secondary/80">
                                                Reenviar código
                                            </a>
                                        </div>

                                        <div className="flex space-x-3 justify-center">
                                            {[...Array(6)].map((_, index) => (
                                                <PinCodeInputComponent
                                                    key={index}
                                                    index={index}
                                                    name="pin"
                                                    inputRefs={inputRefs}
                                                />
                                            ))}
                                        </div>
                                        {errors.pin && (
                                            <p className="mt-2 text-sm text-red-600">
                                                {errors.pin.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <ButtonComponent size="small" type="submit">Verificar</ButtonComponent>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-gray-500">
                                                Problemas com o código?
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <a href="#" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Reenviar por email
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </FormProvider>
    );
};
