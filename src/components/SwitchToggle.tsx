import { useState } from "react";

type SwitchToggleProps = {
    defaultValue?: boolean;
    onChange?: (value: boolean) => void;
};

export const SwitchToggle = ({ onChange, defaultValue }: SwitchToggleProps) => {
    const [checked, setChecked] = useState(defaultValue || false);

    const handleToggle = () => {
        const value = !checked;
        setChecked(value);
        onChange?.(value); // dispara para o pai se tiver
    };

    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={handleToggle}
            />
            <div className="w-12 h-7 bg-gray-200 rounded-full peer-checked:bg-secondary transition-colors duration-200 ease-out"></div>
            <div
                className="absolute left-0.5 top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transform peer-checked:translate-x-5 transition-transform duration-200 ease-out"
            ></div>
        </label>
    );
};
