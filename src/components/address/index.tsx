import * as yup from "yup"
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { InputLabel } from "../input-label";
import { Divider } from "../divider";
import type { IAddress } from "../../types/IAddress";
import { ButtonComponent } from "../button";

const enderecoSchame = yup.object({
    cep: yup.string().required("Informe o cep"),
    logradouro: yup.string().required("Informe o logradouro"),
    numero: yup.string().required("Informe o numero"),
    complemento: yup.string(),
    bairro: yup.string().required("Informe o bairro"),
    localidade: yup.string().required("Informe a cidade"),
    uf: yup.string().required("Informe o estado")
})
type EnderecoFormData = yup.InferType<typeof enderecoSchame>


interface FormEnderecoProps {
    isOpen: boolean
    onConfirm: (enderecos: IAddress) => void
    onCancel: () => void
}

export const EnderecoComponent = ({ onCancel, onConfirm, isOpen }: FormEnderecoProps) => {

    const { register: registerEndereco, handleSubmit: handleSubmitEndereco, formState: { errors }, reset: resetEndereco, setValue, clearErrors } = useForm<EnderecoFormData>({
        resolver: yupResolver(enderecoSchame),
        defaultValues: {
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            localidade: "",
            uf: ""
        }
    });

    const buscarCep = async (cep: string) => {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                return;
            }

            setValue("logradouro", data.logradouro || "");
            setValue("bairro", data.bairro || "");
            setValue("localidade", data.localidade || "");
            setValue("uf", data.uf || "");
            clearErrors(["cep", "logradouro", "bairro", "localidade", "uf"]);
        } catch (error) {
            console.log(error);
        }
    }

    const onSubmitEndereco = (formDataEndereco: EnderecoFormData) => {

        const novoEndereco: IAddress = {
            cep: formDataEndereco.cep,
            logradouro: formDataEndereco.logradouro,
            numero: formDataEndereco.numero,
            complemento: formDataEndereco.complemento ?? "",
            bairro: formDataEndereco.bairro,
            localidade: formDataEndereco.localidade,
            uf: formDataEndereco.uf,
        }

        onConfirm(novoEndereco);
        resetEndereco();
        onCancel();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 rounded-xl w-[750px]">
                <h2 className="text-xl font-bold mb-4">Cadastro de endereço</h2>
                <form  onSubmit={handleSubmitEndereco(onSubmitEndereco)}>
                    <div className="grid grid-cols-12 gap-4 pb-4">

                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="CEP"
                                {...registerEndereco("cep")}
                                fieldError={errors.cep && errors.cep.message}
                                onBlur={(e) => buscarCep(e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-6 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Rua"
                                {...registerEndereco("logradouro")}
                                fieldError={errors.logradouro && errors.logradouro.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Numero"
                                {...registerEndereco("numero")}
                                fieldError={errors.numero && errors.numero.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Complemento"
                                {...registerEndereco("complemento")}
                                fieldError={errors.complemento && errors.complemento.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Bairro"
                                {...registerEndereco("bairro")}
                                fieldError={errors.bairro && errors.bairro.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="Cidade"
                                {...registerEndereco("localidade")}
                                fieldError={errors.localidade && errors.localidade.message}
                            />
                        </div>
                        <div className="sm:col-span-3 col-span-12 w-full">
                            <InputLabel
                                type="text"
                                labelTitulo="UF"
                                {...registerEndereco("uf")}
                                fieldError={errors.uf && errors.uf.message}
                            />
                        </div>
                    </div>
                    <Divider />
                    <div className="flex justify-end gap-4 mt-6">
                        <ButtonComponent border="outline" onClick={onCancel}>
                            Cancelar
                        </ButtonComponent>
                        <ButtonComponent>
                            Confirmar
                        </ButtonComponent>
                    </div>
                </form>
            </div>
        </div>
    )
}