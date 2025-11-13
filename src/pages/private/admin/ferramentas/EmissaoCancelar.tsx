import { ButtonComponent } from "../../../../components/button";
import { InputLabel } from "../../../../components/input-label";
import { Content } from "../../Content";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { EmissaoService } from "../../../../services/EmissaoService";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { toastSuccess } from "../../../../utils/toastNotify";

const etiquetaRegex = /^[a-zA-Z]{2}\d{9}[a-zA-Z]{2}$/;

const schemaCancelarEmissao = yup.object({
    codigoObjeto: yup
        .string()
        .required("Campo obrigatório")
        .matches(etiquetaRegex, "Código de rastreio inválido"),
    motivo: yup
        .string()
        .required("Campo obrigatório"),
});

type FormDataCancelarEmissao = yup.InferType<typeof schemaCancelarEmissao>;

const EmissaoCancelar = () => {
    const service = new EmissaoService();
    const { isSpinnerLoading, setIsLoading } = useLoadingSpinner();
    const { handleSubmit, register, formState: { errors }, reset } = useForm<FormDataCancelarEmissao>({
        resolver: yupResolver(schemaCancelarEmissao),
    });

    const mutation = useMutation({
        mutationFn: async (data: FormDataCancelarEmissao) => {
            setIsLoading(true);
            await service.cancelarEmissao({ codigoObjeto: data.codigoObjeto, motivo: data.motivo });
        },
        onSuccess: () => {
            toastSuccess("Cancelamento realizado com sucesso!");
            setIsLoading(false);
            reset();
        },
        onError: (error) => {
            setIsLoading(false);
            throw error;
        }

    });

    const onSubmit = async (data: FormDataCancelarEmissao) => {
        await mutation.mutate(data);
    }

    return (
        <Content
            titulo="Cancelar Emissão"
            subTitulo="Ferramenta para cancelar a emissão de etiquetas"
            isLoading={isSpinnerLoading}
        >

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex gap-4 bg-white w-full p-4 rounded-xl border border-input flex-col">
                    <div className="flex flex-col gap-4">
                        <InputLabel type="text" labelTitulo="Codigo Objeto"
                            placeholder="Código do objeto: exemplo: ABC123456789BR"
                            {...register("codigoObjeto")}
                            fieldError={errors.codigoObjeto?.message}
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-400 text-sm font-medium leading-5">Motivo do cancelamento</label>
                            <textarea
                                className={`w-full h-24 p-2 rounded-lg border border-gray-300 focus:outline-none ${errors.motivo
                                    ? 'border-1 border-red-600 focus:ring-1 focus:ring-red-600'
                                    : 'border border-gray-300'
                                    }`}
                                placeholder="Motivo do cancelamento"
                                {...register("motivo")}
                            />
                            <small className={`text-gray-500 text-xs`}>O motivo deve ter pelo menos 10 caracteres.</small>
                            {errors.motivo && <span className="text-red-500 text-sm">{errors.motivo.message}</span>}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <ButtonComponent>Confirmar Cancelamento</ButtonComponent>
                    </div>
                </div>
            </form>
        </Content >
    );
}

export default EmissaoCancelar;