import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ILogData, IResponseLogs, Log } from "../../types/ITransportadora";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExpandableText } from "../ExpandableText";

interface AccordionProps {
    items: IResponseLogs[];
}

export const Accordion = ({ items }: AccordionProps) => {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleAccordion = (index: any) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <>
            {items.map((item: IResponseLogs, index) => (
                <div key={index} className="border-b border-gray-300">
                    <button onClick={() => toggleAccordion(index)} className="flex justify-between items-center w-full p-4 text-left text-gray-800 font-medium bg-gray-100 hover:bg-gray-200 rounded-t-lg">
                        {format(new Date(item.agrupamento_titulo + " 00:00"), "dd MMM yyyy", { locale: ptBR })}
                        <ChevronDown className={`transition-transform duration-300 ${openIndex === index ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? "p-4" : "max-h-0 p-0"}`}>
                        {item.data.map((log: ILogData, logIndex) => (
                            <div key={logIndex} className="mb-4 h-auto">
                                <div className="mb-2 border-b border-t border-gray-300 p-2">
                                    <span className="font-semibold text-secondary">{log.agrupamento_titulo}</span>
                                </div>
                                <ul className="flex flex-col gap-1 px-6">
                                    {log.data.map((data: Log, dataIndex) => (
                                        <li key={dataIndex} className="mb-2 flex flex-col">
                                            <span className="font-semibold text-slate-600"> {format(data.data, "HH:mm", { locale: ptBR })}</span>
                                            {data.conteudo.exception && data.conteudo.exception.length > 0 ? (
                                                <>
                                                    <ExpandableText text={data.conteudo.exception} />
                                                </>
                                            ) : (
                                                <p className="text-slate-600 text-xs">
                                                    Um log foi registrado, mas nenhum log de texto foi encontrado
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}