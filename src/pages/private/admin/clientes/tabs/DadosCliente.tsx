// Tabs/DadosCliente.tsx
import { useFormContext } from "react-hook-form";
import type { FormDataCliente } from "../../../../../utils/schames/clientes";
import { Divider } from "../../../../../components/divider";
import { InputLabel } from "../../../../../components/input-label";
import { formatCep, formatCpfCnpj, formatTelefone } from "../../../../../utils/lib.formats";

interface DadosClienteProps {
    onBuscaCep: (cep: string) => Promise<any>;
}

export const DadosCliente = ({ onBuscaCep }: DadosClienteProps) => {
    const { register, setValue, setFocus, formState: { errors }, clearErrors } = useFormContext<FormDataCliente>();

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const cep = formatCep(e.target.value);
        setValue("endereco.cep", cep);
        if (cep.replace(/\D/g, "").length === 8) {
            const address = await onBuscaCep(cep);
            if (address) {
                setValue("endereco.logradouro", address.logradouro);
                setValue("endereco.bairro", address.bairro);
                setValue("endereco.localidade", address.localidade);
                setValue("endereco.uf", address.uf);
                setFocus("endereco.numero");

                clearErrors(["endereco.cep", "endereco.logradouro", "endereco.bairro", "endereco.localidade", "endereco.uf"]);

            }
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-semibold">Dados do Cliente</h2>
            <Divider />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputLabel type="text" labelTitulo="Nome" {...register("nomeEmpresa")} fieldError={errors.nomeEmpresa?.message} />
                    <InputLabel type="text" labelTitulo="Nome do Responsável" {...register("nomeResponsavel")} fieldError={errors.nomeResponsavel?.message} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputLabel type="text" labelTitulo="CPF/CNPJ" {...register("cpfCnpj", {
                        onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                            const valor = formatCpfCnpj(e.target.value);
                            setValue("cpfCnpj", valor);
                        }
                    })} fieldError={errors.cpfCnpj?.message} />
                    <InputLabel type="text" labelTitulo="Telefone" {...register("telefone",
                        {
                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                const valor = formatTelefone(e.target.value, 'telefone');
                                setValue("telefone", valor);
                            }
                        }
                    )} fieldError={errors.telefone?.message} />
                    <InputLabel type="text" labelTitulo="Celular" {...register("celular",
                        {
                            onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                const valor = formatTelefone(e.target.value, 'celular');
                                setValue("celular", valor);
                            }
                        }
                    )} fieldError={errors.celular?.message} />
                </div>
            </div>

            <h3 className="font-semibold mt-6">Endereço</h3>
            <Divider />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="sm:col-span-2 col-span-12">
                    <InputLabel
                        type="text"
                        labelTitulo="CEP"
                        {...register("endereco.cep", { onChange: handleCepChange })}
                        fieldError={errors.endereco?.cep?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Rua"
                        {...register("endereco.logradouro")}
                        fieldError={errors.endereco?.logradouro?.message}
                    />
                </div>
                <div className="sm:col-span-2 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Número"
                        {...register("endereco.numero")}
                        fieldError={errors.endereco?.numero?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Complemento"
                        {...register("endereco.complemento")}
                        fieldError={errors.endereco?.complemento?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Bairro"
                        {...register("endereco.bairro")}
                        fieldError={errors.endereco?.bairro?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="Cidade"
                        disabled
                        isDisabled
                        {...register("endereco.localidade")}
                        fieldError={errors.endereco?.localidade?.message}
                    />
                </div>
                <div className="sm:col-span-4 col-span-12 w-full">
                    <InputLabel
                        type="text"
                        labelTitulo="UF"
                        disabled
                        isDisabled
                        {...register("endereco.uf")}
                        fieldError={errors.endereco?.uf?.message}
                    />
                </div>
            </div >
        </div >
    );
};
