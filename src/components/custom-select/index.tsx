import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

interface CustomSelectProps {
    label: string;
    data?: { label: string; value: string }[];
    valueSelected?: string;
    onChange: (valor: string) => void;
    fieldError?: string;
}

const SelectCustom = forwardRef<HTMLDivElement, CustomSelectProps>(
    ({ data = [], label, valueSelected = "", onChange, fieldError }, ref) => {
        const [open, setOpen] = useState(false);
        const toggleDropdown = () => setOpen(!open);

        // Armazena o valor selecionado e o label correspondente
        const [selectedOptionValue, setSelectedOptionValue] = useState<string>(valueSelected);
        const [selectedOptionLabel, setSelectedOptionLabel] = useState<string>(
            data.find((option) => option.value === valueSelected)?.label || ""
        );
        // Atualiza o estado interno quando o prop valueSelected muda
        useEffect(() => {
            const found = data.find((option) => option.value === valueSelected);
            setSelectedOptionValue(found ? found.value : "");
            setSelectedOptionLabel(found ? found.label : "");
        }, [valueSelected, data]);

        const handleOptionClick = (option: { label: string; value: string }) => {
            // Se o valor clicado for o mesmo que o selecionado, deseleciona
            if (option.value === selectedOptionValue) {
                setSelectedOptionValue("");
                setSelectedOptionLabel("");
                onChange("");
            } else {
                setSelectedOptionValue(option.value);
                setSelectedOptionLabel(option.label);
                onChange(option.value);
            }
            setOpen(false);
        };

        return (
            <div ref={ref} className="gap-1 flex flex-col w-full">
                <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-5">{label}</span>
                <div className="relative">
                    <button id="dropdown-button" type="button" onClick={toggleDropdown} className="flex items-center justify-between w-full p-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                        <span id="selected-option" className="text-zinc-400 dark:text-zinc-300">
                            {selectedOptionLabel || "Selecione uma opção"}
                        </span>
                        <ChevronDown className={`w-5 h-5 ml-2 text-gray-400 dark:text-gray-300 transition-transform ${open ? "rotate-180" : ""} `} />
                    </button>

                    <div
                        id="dropdown-options"
                        className={`
                            absolute 
                            w-full 
                            mt-1 
                            bg-white 
                            dark:bg-slate-800
                            border 
                            border-gray-200 
                            dark:border-gray-600
                            rounded-lg 
                            shadow-lg 
                            overflow-hidden 
                            z-50 
                            ${open ? "" : "hidden"}
                        `}
                    >
                        <div className="max-h-60 overflow-y-auto">
                            {data.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={`
                                        flex
                                        flex-row
                                        justify-between
                                        px-4 
                                        py-2 
                                        text-sm 
                                        text-gray-700 
                                        dark:text-gray-200
                                        hover:bg-blue-100/20  
                                        dark:hover:bg-slate-700
                                        cursor-pointer 
                                        transition-colors
                                        ${valueSelected === option.value ? "bg-blue-100/45" : ""}
                                    `} // Adicione uma classe para estilização aqui, se necessário. Ex: "px-4 py-2 text-sm text-gray-700 hover:bg-primary/10 cursor-pointer transition-colors"
                                >
                                    <span>{option.label}</span> 
                                    <Check className={`w-5 h-5 ml-2 text-gray-400 ${valueSelected === option.value ? "block" : "hidden"}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {fieldError && <span className="text-red-500 text-sm">{fieldError}</span>}
            </div>
        );
    }
);

export default SelectCustom;
