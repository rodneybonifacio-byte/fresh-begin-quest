import { useFormContext } from "react-hook-form";
import type { PinFormData } from "../pages/site/login/pin-code";

interface PinCodeInputComponentProps {
    index: number;
    name: keyof PinFormData;
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

export const PinCodeInputComponent = ({ index, name, inputRefs }: PinCodeInputComponentProps) => {

    const { setValue, getValues, watch } = useFormContext<PinFormData>();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        if (value.length > 1) return;

        const pin = getValues(name).split('');
        pin[index] = value;
        setValue(name, pin.join(''));

        // Move focus to next input if filled
        if (value && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const pin = getValues(name).split('');
        if (e.key === "Backspace" && !pin[index] && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const pin = watch(name);
    const pinValue = pin.split('')[index] || '';

    return (
        <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            value={pinValue}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="
                    w-12 
                    h-12 
                    text-center 
                    text-2xl 
                    font-semibold 
                    border 
                    border-slate-300
                    focus:outline-none
                    rounded-md 
                    focus:ring-secondary 
                    focus:border-secondary
                "
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        />
    );
};
