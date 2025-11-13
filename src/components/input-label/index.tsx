import React, { forwardRef, ComponentProps } from "react";
import { Eye, EyeOff, Plus, Search, TriangleAlert } from "lucide-react";
import { tv, VariantProps } from "tailwind-variants";

const inputVariants = tv({
    base: 'w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-[16px] focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-600 dark:disabled:text-slate-400 min-w-0',

    variants: {
        variant: {},
        typeSize: {
            email: 'lowercase'
        }
    },
    defaultVariants: {}
});



const inputLabelGroupVariants = tv({
    base: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 relative flex items-center rounded-md p-3 border border-[#e3e4e8] dark:border-slate-600 min-w-0',

    variants: {
        variant: {
            primary: 'focus-within:ring-2 focus-within:ring-primary dark:focus-within:ring-primary-dark',
            danger: 'border-red-600 border focus:ring-1 focus:ring-red-600',
            disabled: 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        }
    },

    defaultVariants: {
        variant: 'primary'
    }
});

interface InputLabelGroupProps extends ComponentProps<'div'>, VariantProps<typeof inputLabelGroupVariants> {
    children: React.ReactNode
}

const InputLabelGroup = ({ variant, children, ...props }: InputLabelGroupProps) => {
    return (
        <div className={inputLabelGroupVariants({ variant })} {...props}>
            {children}
        </div>
    )
}

interface InputLabelProps extends ComponentProps<'input'>, VariantProps<typeof inputVariants> {
    labelTitulo: string,
    fieldError?: string,
    isPassword?: boolean,
    isDisabled?: boolean,
    isButtomSearch?: boolean
    buttonSearchClick?: () => void
    isButton?: boolean
    buttonClick?: () => void
    ref: any
}

export const InputLabel = forwardRef<HTMLInputElement, InputLabelProps>(({ labelTitulo, fieldError, variant, typeSize, isPassword, isButton, buttonClick, isDisabled, isButtomSearch, buttonSearchClick, ...props }, ref) => {

    const [showPassword, setShowPassword] = React.useState<boolean>(false);

    const handleTypePassword = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div className="w-full flex flex-col gap-1 relative">
            <label className="text-slate-400 dark:text-slate-300 text-xs font-medium leading-5">{labelTitulo}</label>
            {/* A div pai recebe o focus quando o input está focado */}
            <InputLabelGroup variant={fieldError ? "danger" : isDisabled ? "disabled" : "primary"}>
                <input
                    {...props}
                    ref={ref}
                    // type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
                    className={inputVariants({ typeSize })}
                />
                {/* Ícone de alerta posicionado sobre o input */}
                {fieldError && (
                    <div className={`absolute ${isPassword ? fieldError ? 'right-12' : '' : 'right-4'} top-1/2 transform -translate-y-1/2`}>
                        <TriangleAlert className="text-red-500" />
                    </div>
                )}

                {isPassword && (
                    <div onClick={handleTypePassword} className={`absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer`}>
                        {showPassword ? <Eye className="text-gray-500 dark:text-gray-400" /> : <EyeOff className="text-gray-500 dark:text-gray-400" />}
                    </div>
                )}

                {isButton && (
                    <div className="absolute right-4 inset-y-0 flex flex-row gap-3 items-center cursor-pointer">
                        {isButtomSearch && (
                            <div onClick={buttonSearchClick} className="cursor-pointer">
                                <Search className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-dark" />
                            </div>
                        )}
                        <div onClick={buttonClick} className="cursor-pointer p-2 bg-secondary dark:bg-secondary-dark rounded-md">
                            <Plus className="text-white" />
                        </div>
                    </div>
                )}
            </InputLabelGroup>
            {fieldError && <span className="text-gray-500 dark:text-gray-400 text-sm"> {fieldError} </span>}
        </div>
    )
});