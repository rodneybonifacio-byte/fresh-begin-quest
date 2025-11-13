import { useState } from "react";

interface SubParametro {
    nome: string;
    tipo: string;
    descricao: string;
    obrigatorio?: boolean;
    subParametros?: SubParametro[];
}

interface ApiDocItemParametroProps extends SubParametro { }

const ParametroItem = ({ nome, tipo, descricao, obrigatorio, subParametros }: ApiDocItemParametroProps) => {
    const [expandido, setExpandido] = useState(false);

    return (
        <li>
            <div className="flex items-center gap-2">

                <div>
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{nome} </span>
                    <small className="text-xs text-gray-600 dark:text-gray-400">({tipo})</small>
                </div>
                {subParametros && (
                    <button
                        type="button"
                        onClick={() => setExpandido((prev) => !prev)}
                        className="text-xs font-semibold text-primary dark:text-primary-dark underline hover:text-primary/80 dark:hover:text-primary-dark/80"
                    >
                        {expandido ? "Ocultar detalhes" : "Mostrar detalhes"}
                    </button>
                )}
            </div>

            <div className="flex flex-row gap-1 text-xs mt-1">
                <span className="text-gray-600 dark:text-gray-300">{descricao}</span>
                <small className={obrigatorio ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>
                    ({obrigatorio ? "obrigatório" : "opcional"})
                </small>
            </div>

            {expandido && subParametros && subParametros.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    {subParametros.map((sub) => (
                        <ParametroItem key={sub.nome} {...sub} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const ApiDocItemParametro = ParametroItem;