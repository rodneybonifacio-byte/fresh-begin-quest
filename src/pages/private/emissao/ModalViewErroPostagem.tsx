import { useEffect, useState } from "react";
import { ModalCustom } from "../../../components/modal";

interface ModalViewErroPostagemProps {
    isOpen: boolean;
    jsonContent: string;
    onCancel: () => void;
}

export const ModalViewErroPostagem = ({ isOpen, jsonContent, onCancel }: ModalViewErroPostagemProps) => {
    const [mensagens, setMensagens] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        try {
            const parsed = JSON.parse(jsonContent);
            if (parsed.msg) {
                setMensagens([parsed.msg]);
            } else if (Array.isArray(parsed.msgs)) {
                setMensagens(parsed.msgs);
            } else {
                setMensagens(["Erro desconhecido."]);
                onCancel?.();
            }
        } catch {
            setMensagens(["Erro ao interpretar a mensagem de erro."]);
        }
    }, [jsonContent, isOpen]);

    if (!isOpen) return null;

    return (
        <ModalCustom
            title="Error de visualização"
            description="Visualização de errores de postagem de etiquetas, por favor verifique as mensagens e tente novamente ou contate o suporte."
            onCancel={onCancel}
        >
            <div className="flex flex-col gap-4 w-full mt-6">
                <ul className="list-disc list-inside space-y-1 flex flex-col gap-3">
                    {mensagens.map((msg, index) => (
                        <li key={index} className="text-red-500 font-semibold border p-2 rounded-lg border-red-300">{msg}</li>
                    ))}
                </ul>
            </div>
        </ModalCustom>
    );
};
