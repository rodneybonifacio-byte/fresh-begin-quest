import { Check, ChevronDown } from 'lucide-react';
import { forwardRef, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom'

interface CustomSelectProps {
    label: string;
    data?: { label: string; value: string }[];
    valueSelected?: string | string[];
    onChange: (valor: string | string[]) => void;
    fieldError?: string;
    searchable?: boolean;
    multiple?: boolean;
    isLoading?: boolean;
}

const SelectCustom = forwardRef<HTMLDivElement, CustomSelectProps>(({
    data = [],
    label,
    valueSelected = "",
    onChange,
    fieldError,
    searchable = false,
    multiple = false,
    isLoading = false
}, ref
) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    // const [dropdowStyles, setDropdownStyles] = useState<React.CSSProperties | null>(null);
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const toggleDropdown = () => setOpen(!open);

    const [selectedOptionValue, setSelectedOptionValue] = useState<string | string[]>(valueSelected);
    const [selectedOptionLabel, setSelectedOptionLabel] = useState<string>(
        typeof valueSelected === 'string'
            ? data.find((option) => option.value === valueSelected)?.label || ""
            : ""
    );

    useEffect(() => {
        setSelectedOptionValue(valueSelected);
        if (typeof valueSelected === 'string') {
            const found = data.find((option) => option.value === valueSelected);
            setSelectedOptionLabel(found ? found.label : "");
        }
    }, [valueSelected, data]);

    const handleOptionClick = (option: { label: string; value: string }) => {
        if (multiple) {
            let newSelected = Array.isArray(selectedOptionValue) ? [...selectedOptionValue] : [];
            if (newSelected.includes(option.value)) {
                newSelected = newSelected.filter((v) => v !== option.value);
            } else {
                newSelected.push(option.value);
            }
            setSelectedOptionValue(newSelected);
            onChange(newSelected);
        } else {
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
        }
    };

    const filteredOptions = searchable
        ? data.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : data;

    const isOptionSelected = (optionValue: string) => {
        if (Array.isArray(selectedOptionValue)) {
            return selectedOptionValue.includes(optionValue);
        }
        return selectedOptionValue === optionValue;
    };

    const renderDropdown = () => {
        if (!open || !buttonRef.current) return null
        const rect = buttonRef.current.getBoundingClientRect();
        const portalRoot = document.getElementById("portal-root");
        if (!portalRoot) return null

        return ReactDOM.createPortal(
            <div
                className="absolute bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-[9999]"
                style={{
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    position: 'absolute',
                }}
            >
                <div className="max-h-60 overflow-y-auto">
                    {searchable && (
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    )}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                            <span className="text-sm text-primary dark:text-primary-dark mt-2">Carregando...</span>
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</div>
                    ) : (
                        filteredOptions.map((option) => {
                            const selected = isOptionSelected(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={`flex flex-row justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-100/20 dark:hover:bg-slate-600 cursor-pointer z-10 transition-colors ${selected ? "bg-blue-100/45 dark:bg-slate-600" : ""}`}
                                >
                                    <span>{option.label}</span>
                                    <Check className={`w-5 h-5 ml-2 text-gray-400 dark:text-gray-300 ${selected ? "block" : "hidden"}`} />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>,
            portalRoot
        )
    }

    return (
        <div ref={ref} className="gap-1 flex flex-col w-full z-50">
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-5">{label}</span>
            <div className="relative">
                <button
                    ref={buttonRef}
                    id="dropdown-button"
                    type="button"
                    onClick={toggleDropdown}
                    className="flex items-center justify-between w-full p-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-dark focus:border-primary dark:focus:border-primary-dark"
                >
                    <span id="selected-option" className="text-zinc-400 dark:text-zinc-300 truncate text-left">
                        {multiple
                            ? Array.isArray(selectedOptionValue) && selectedOptionValue.length > 0
                                ? `${selectedOptionValue.length} selecionado(s)`
                                : "Selecione uma opção"
                            : selectedOptionLabel || "Selecione uma opção"}
                    </span>
                    <ChevronDown
                        className={`w-5 h-5 ml-2 text-gray-400 dark:text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                </button>
                {renderDropdown()}
            </div>
            {fieldError && <span className="text-red-500 dark:text-red-400 text-sm">{fieldError}</span>}
        </div>
    );
});

export default SelectCustom;
