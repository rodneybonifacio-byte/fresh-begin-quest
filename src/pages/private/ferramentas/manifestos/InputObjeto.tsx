import React from "react";
import { InputLabel } from "../../../../components/input-label";

interface InputProdutoProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onProcessarEntrada: (input: string) => void;
}

export const InputObjeto: React.FC<InputProdutoProps> = ({
    value,
    onChange,
    onProcessarEntrada,
}) => {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === "Enter" || e.key === "Tab") && value.trim() !== "") {
            e.preventDefault();
            onProcessarEntrada(value.trim());
        }
    };

    return (
        <div className="flex flex-col w-full">
            <InputLabel
                labelTitulo="Objeto"
                type="text"
                placeholder="Digite ou leia o barcode do etiqueta"
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyPress}
            />
        </div>
    );
};
