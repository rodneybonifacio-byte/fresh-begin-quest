import { ModalCustom } from "../../../components/modal";
import type { IRemetente } from "../../../types/IRemetente";
import { useEffect, useState } from "react";

interface ModalSelecionarRemetenteProps {
    isOpen: boolean;
    onCancel: () => void
    data: IRemetente[]
    onConfirm: (remetente: IRemetente) => void
}

export const ModalSelecionarRemetente: React.FC<ModalSelecionarRemetenteProps> = ({
    isOpen,
    onCancel,
    data,
    onConfirm
}) => {
    const [remetenteSelecionado, setRemetenteSelecionado] = useState<IRemetente>({} as IRemetente);
    const [remetentes, setRemetentes] = useState<IRemetente[]>(data);

    useEffect(() => {
        if (remetentes) {
            setRemetentes(data);
        } else {
            setRemetentes([]);
        }
    }, [remetentes]);

    const handleSelecionaRemetente = (remetente: IRemetente) => {
        if (remetenteSelecionado.id === remetente.id) {
            setRemetenteSelecionado({} as IRemetente);
        } else {
            setRemetenteSelecionado(remetente);
        }

        onConfirm(remetente);
    }

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Selecionar Remetente"
            description="Selecione um remetente para continuar com a emissão da etiqueta."
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 xl:w-[600px] ">
                <div className="flex flex-col w-full">
                    {data.map((remetente: IRemetente, index) => (
                        <div
                            key={index}
                            onClick={handleSelecionaRemetente.bind(null, remetente)}
                            className={`
                                flex 
                                flex-col 
                                w-full 
                                hover:bg-blue-100/20 
                                cursor-pointer 
                                p-2 
                                rounded-lg
                                ${index !== data.length - 1 ? "border-b" : ""}
                                ${remetenteSelecionado.id === remetente.id ? "bg-blue-100/45" : ""}
                            `}
                        >
                            <h4 className="text-lg font-semibold">
                                {remetente.nome} - <small>{remetente.cpfCnpj}</small>
                            </h4>

                            <div className="text-gray-400 text-semibold text-sm">
                                {remetente.endereco ? (
                                    <span>
                                        {remetente.endereco?.logradouro}, {remetente.endereco?.numero} - {remetente.endereco?.bairro} - {remetente.endereco?.localidade} / {remetente.endereco?.uf}
                                    </span>
                                ) : (
                                    <span>Sem endereço cadastrado</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ModalCustom>
    );
};
