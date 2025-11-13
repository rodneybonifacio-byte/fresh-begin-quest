import { useForm } from "react-hook-form"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { IRastreioResponse } from "../../../types/rastreio/IRastreio"
import { InputLabel } from "../../../components/input-label"
import { ButtonComponent } from "../../../components/button"
import { CorreriosService } from "../../../services/CorreriosService"
import { useEffect } from "react"

//criar regex para valida etiqueta dos correios TJ476922102BR
//valida com yup


const schameFormRastreio = yup.object().shape({
    codigo: yup
        .string()
        .required('O código de rastreio é obrigatório')
        .test(
            'formato-etiqueta-ou-uuid',
            'Código inválido. Use uma etiqueta (AA123456789BB) ou UUID válido.',
            (value) =>
                !!value &&
                (/^[a-zA-Z]{2}\d{9}[a-zA-Z]{2}$/.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        )
});
type FormDataRastreio = yup.InferType<typeof schameFormRastreio>

interface RastreioProps {
    numeroObjeto?: string
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
    setIsResultRastreio: React.Dispatch<React.SetStateAction<boolean>>
    setRastreio: React.Dispatch<React.SetStateAction<IRastreioResponse | undefined>>
    origem?: "publica" | "privada"
}

export const FormularioRastreio = ({ setIsLoading, setIsResultRastreio, setRastreio, numeroObjeto }: RastreioProps) => {

    const queryClient = useQueryClient();
    const service = new CorreriosService();
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormDataRastreio>({
        resolver: yupResolver(schameFormRastreio),
        defaultValues: {
            codigo: numeroObjeto || ''
        },
    })

    const mutation = useMutation({
        mutationFn: async (inputViewModel: FormDataRastreio) => {
            setIsLoading(true);
            return service.rastreio(inputViewModel.codigo)
        },
        onSuccess: () => {
            setIsResultRastreio(true);
            setIsLoading(false);
            queryClient.invalidateQueries({ queryKey: ["rastreio", schameFormRastreio] });
        },
        onError: (_error) => {
            setIsLoading(false);
            setIsResultRastreio(false);
            toast.error("Objeto não encontrado.", { position: "top-center" });
        },
    })

    const handlerOnSubmit = async (data: FormDataRastreio) => {
        try {
            const response = await mutation.mutateAsync(data);
            setRastreio(response ?? undefined);
            setIsResultRastreio(true);
            reset();
        } catch (error) {
            setIsResultRastreio(false);
        }
    }



    useEffect(() => {
        if (numeroObjeto) {
            console.log(numeroObjeto);
            setValue("codigo", numeroObjeto);
            handlerOnSubmit({ codigo: numeroObjeto });
        }
    }, [numeroObjeto]);

    return (
        <form onSubmit={handleSubmit(handlerOnSubmit)} method="POST" className="flex flex-col justify-center items-center gap-2">
            <div className="flex gap-4 w-full">
                <div className="flex flex-col w-full">
                    <InputLabel
                        labelTitulo=""
                        type="text"
                        placeholder="Código de Rastreio"
                        fieldError={errors.codigo?.message}
                        {...register('codigo')}
                    />
                    <p id="endereco-origem" className="text-[10px] text-gray-700"></p>
                </div>
            </div>
            <div className="flex flex-row justify-start  w-full">
                <ButtonComponent size="lg">Enviar</ButtonComponent>
            </div>
        </form>
    )
}