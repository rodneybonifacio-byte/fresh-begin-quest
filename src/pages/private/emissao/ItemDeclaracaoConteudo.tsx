import { PlusCircle, Trash2 } from "lucide-react"
import { InputLabel } from "../../../components/input-label"
import { ButtonComponent } from "../../../components/button"
import * as yup from "yup"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { useState } from "react"
import { Divider } from "../../../components/divider"
import { formatCurrency, formatNumberString } from "../../../utils/formatCurrency"
import type { IEmissaoItensDeclaracaoConteudo } from "../../../types/IEmissao"

const schemaDeclaracaoConteudo = yup.object().shape({
    descricao: yup.string().required("Descrição obrigatorio"),
    quantidade: yup.string().required("Quantidade obrigatorio"),
    valor: yup.string().required("Valor obrigatorio"),
})

type FormDataDeclaracaoConteudo = yup.InferType<typeof schemaDeclaracaoConteudo>

interface IItemDeclaracaoConteudoProps {
    onData: (item: IEmissaoItensDeclaracaoConteudo[]) => void
}

export const ItemDeclaracaoConteudo = ({ onData }: IItemDeclaracaoConteudoProps) => {

    const [declaracaoConteudo, setDeclaracaoConteudo] = useState<IEmissaoItensDeclaracaoConteudo[]>([])

    const { register, handleSubmit: handleSubmitDeclaracao, formState: { errors }, setValue } = useForm<FormDataDeclaracaoConteudo>({
        resolver: yupResolver(schemaDeclaracaoConteudo),
    })

    const onSubmit = (data: FormDataDeclaracaoConteudo) => {

        const novoItem: IEmissaoItensDeclaracaoConteudo = {
            conteudo: data.descricao,
            quantidade: data.quantidade,
            valor: formatNumberString(data.valor),
        };

        const novaLista = [...declaracaoConteudo, novoItem];

        setDeclaracaoConteudo(novaLista);
        onData(novaLista);

        setValue("descricao", "");
        setValue("quantidade", "");
        setValue("valor", "");
    }

    const handleRemove = (index: number) => {
        setDeclaracaoConteudo((prev) => {
            const novaLista = prev.filter((_, i) => i !== index);
            onData(novaLista);
            return novaLista;
        });
    };


    return (
        <div className="flex flex-col w-full gap-4">
            <div className="flex gap-4 flex-col">
                <div className="grid sm:grid-cols-12 grid-cols-1 gap-4 flex-col w-full">
                    <div className="col-span-4 w-full">
                        <InputLabel
                            type="text"
                            labelTitulo="Descrição"
                            {...register("descricao")}
                            fieldError={errors.descricao?.message}
                        />
                    </div>
                    <div className="col-span-4">
                        <InputLabel
                            type="number"
                            labelTitulo="Quantidade"
                            {...register("quantidade")}
                            fieldError={errors.quantidade?.message}
                        />
                    </div>
                    <div className="col-span-4">
                        <InputLabel
                            type="text"
                            labelTitulo="Valor"
                            {...register("valor", {
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const valor = formatCurrency(e.target.value);
                                    setValue("valor", valor);
                                },
                            })}
                            fieldError={errors.valor?.message}
                        />
                    </div>
                </div>
                <div className="col-span-3 w-full">
                    <ButtonComponent type="button" variant="secondary" onClick={handleSubmitDeclaracao(onSubmit)}>
                        <PlusCircle /> Adicionar
                    </ButtonComponent>
                </div>
            </div>
            {declaracaoConteudo.length > 0 && <Divider />}
            {declaracaoConteudo.length > 0 && (
                <table className="sm:min-w-[600px] w-full table-auto">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Descrição</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Quantidade</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Valor</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 uppercase"> </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {declaracaoConteudo.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">{item.conteudo}</td>
                                <td className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">{item.quantidade}</td>
                                <td className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">{item.valor}</td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-700 uppercase">
                                    <Trash2
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => handleRemove(index)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
