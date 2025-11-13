import { InputLabel } from "../../../components/input-label"

interface IItemNotaFiscalProps {
    setNotaFiscal: (notaFiscal: string) => void
    setChaveNfe: (chaveNfe: string) => void
}

export const ItemNotaFiscal = ({ setNotaFiscal, setChaveNfe }: IItemNotaFiscalProps) => {

    return (
        <div className="grid grid-cols-6 gap-3 w-full justify-between">
            <div className="flex w-full col-span-3">
                <InputLabel labelTitulo="Número da nota fiscal:" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotaFiscal(e.target.value)} />
            </div>
            <div className="flex w-full col-span-3">
                <InputLabel labelTitulo="Chave da NFE" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChaveNfe(e.target.value)} />
            </div>
        </div>
    )
}