import { useState } from "react";

export interface ItemCheckboxSelected {
    label: string;
    value: string;
}

interface CustomCheckboxProps {
    item: ItemCheckboxSelected;
    valueSelected?: string;
    onSelected: (item: ItemCheckboxSelected, selected: boolean) => void;
}

export default function RadioCustom({ item, valueSelected, onSelected }: CustomCheckboxProps) {
    const [checked, setChecked] = useState(false);

    const handleCheckboxChange = () => {
        const novoEstado = !checked;
        setChecked(novoEstado);
        onSelected(item, novoEstado);
    };

    return (
        <div key={item.value} className="flex items-center gap-1 cursor-pointer ">
            <input
                id={item.value}
                type="radio"
                name="frete"
                checked={valueSelected === item.value}
                onChange={handleCheckboxChange}
                className="h-5 w-5 cursor-pointer accent-secondary text-secondary focus:ring-secondary"
            />
            <label htmlFor={item.value} className="ml-2 text-black cursor-pointer">
                {item.label}
            </label>
        </div>
    );
}
