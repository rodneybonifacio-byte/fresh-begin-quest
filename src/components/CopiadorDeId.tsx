import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopiadorDeId({ id }: { id: string }) {
    const [copiado, setCopiado] = useState(false);

    const copiar = () => {
        navigator.clipboard.writeText(id);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000); // volta após 2s
    };

    return (
        <span className="font-medium text-xs text-slate-400">
            id: {id}
            {copiado ? (
                <Check
                    size={14}
                    className="inline ml-1 text-green-500"
                />
            ) : (
                <Copy
                    size={14}
                    className="inline cursor-pointer ml-1 text-gray-500 hover:text-gray-700"
                    onClick={copiar}
                />
            )}
        </span>
    );
}
