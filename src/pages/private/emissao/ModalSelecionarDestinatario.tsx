import { useEffect, useState } from "react";
import { Divider } from "../../../components/divider";
import { ModalCustom } from "../../../components/modal";
import type { IDestinatario } from "../../../types/IDestinatario";
import { Paginacao } from "../../../components/paginacao";
import { useGlobalConfig } from "../../../providers/GlobalConfigContext";

interface ModalSelecionarDestinatarioProps {
    isOpen: boolean;
    onCancel: () => void
    data: IDestinatario[]
    onConfirm: (destinatario: IDestinatario) => void
}

export const ModalSelecionarDestinatario: React.FC<ModalSelecionarDestinatarioProps> = ({
    isOpen,
    onCancel,
    data,
    onConfirm
}) => {
    const [destinatarioSelecionado, setDestinatarioSelecionado] = useState<IDestinatario>({} as IDestinatario);
    const [destinatarios, setDestinatarios] = useState<IDestinatario[]>(data);
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);

    useEffect(() => {
        setDestinatarios(data ?? []);
    }, [data]);


    const handleSelecionaRemetente = (destinatario: IDestinatario) => {
        if (destinatarioSelecionado.id === destinatario.id) {
            setDestinatarioSelecionado({} as IDestinatario);
        } else {
            setDestinatarioSelecionado(destinatario);
        }

        onConfirm(destinatario);
    }

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Selecionar Destinatário"
            description="Selecione um destinatário para continuar com a emissão da etiqueta."
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 w-full xl:w-[600px] ">
                <Divider />
                <div className="flex flex-col w-full">
                    {destinatarios.map((remetente: IDestinatario, index) => (
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
                                ${destinatarioSelecionado.id === remetente.id ? "bg-blue-100/45" : ""}
                            `}
                        >
                            <h4 className="text-sm font-semibold">
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

                    {data && data.length > page.perPage && (
                        <Paginacao data={data || []} setData={setDestinatarios} dataPerPage={page.perPage} />
                    )}
                </div>
            </div>
        </ModalCustom>
    );
};
