import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { DestinatarioService } from "../../services/DestinatarioService";
import { useFetchQuery } from "../../hooks/useFetchQuery";
import type { IDestinatario } from "../../types/IDestinatario";
import { InputLabel } from "../input-label";

interface AutocompleteDestinatarioProps {
    onSelect: (destinatario: IDestinatario) => void;
}

export const AutocompleteDestinatario: React.FC<AutocompleteDestinatarioProps> = ({ onSelect }) => {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const service = new DestinatarioService();

    // Debounce: atualiza debouncedSearch 300ms após a última digitação
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);


    const { data: suggestions, isLoading } = useFetchQuery<IDestinatario[]>(
        ['destinatarios', debouncedSearch],
        async () => {
            const response = await service.getAll({ nomeDestinatario: debouncedSearch });
            return response.data ?? [];
        },
        {
            enabled: debouncedSearch.trim().length > 0,
            staleTime: 60000,
        }
    );

    // Verifica se o nome digitado não existe nas sugestões
    const shouldShowNewOption =
        debouncedSearch.trim() !== "" &&
        (!suggestions || !suggestions.some(dest => dest.nome.toLowerCase() === debouncedSearch.trim().toLowerCase()));

    const handleSelect = (destinatario: IDestinatario) => {
        onSelect(destinatario);
        setSearch(destinatario.nome);
        setIsOpen(false);
    };

    // Se o usuário optar por criar um novo destinatário com o nome digitado
    const handleSelectNew = () => {
        handleSelect({
            id: "",
            nome: search,
            cpfCnpj: "",
            telefone: "",
            celular: "",
            email: "",
            endereco: {
                cep: "",
                logradouro: "",
                numero: "",
                complemento: "",
                bairro: "",
                localidade: "",
                uf: "",
                pontoReferencia: "",
            }
        } as IDestinatario);
    };

    return (
        <div className="relative">
            <InputLabel
                type="text"
                labelTitulo="Nome do Destinatario:"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setIsOpen(true);
                }}
            />
            {isOpen && (suggestions || shouldShowNewOption) && (
                <ul
                    className={clsx(
                        "absolute z-10 w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 mt-1 rounded-md shadow-lg",
                        suggestions && suggestions?.length > 10 && "max-h-60 overflow-y-auto"
                    )}
                >
                    {isLoading ? (
                        <li className="p-2 text-gray-600 dark:text-gray-300">Carregando...</li>
                    ) : (
                        <>
                            {suggestions && suggestions.map((destinatario) => (
                                <li
                                    key={destinatario.id}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-gray-900 dark:text-gray-100"
                                    onClick={() => handleSelect(destinatario)}
                                >
                                    {destinatario.nome}
                                </li>
                            ))}
                            {shouldShowNewOption && suggestions?.length === 0 && (
                                <li
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-t border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                    onClick={handleSelectNew}
                                >
                                    <strong>{search}</strong>
                                </li>
                            )}
                        </>
                    )}
                </ul>
            )}
        </div>
    );
};
