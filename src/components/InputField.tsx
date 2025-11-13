import { InputHTMLAttributes, ReactNode, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    showPasswordToggle?: boolean;
}

export const InputField = ({ 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon,
    showPasswordToggle,
    type = "text",
    className = "",
    ...props 
}: InputFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle && showPassword ? "text" : type;

    return (
        <div className="space-y-2">
            {/* Label */}
            {label && (
                <label className="block text-sm font-semibold text-foreground">
                    {label}
                    {props.required && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            {/* Input Container */}
            <div className="relative group">
                {/* Left Icon */}
                {leftIcon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors">
                        {leftIcon}
                    </div>
                )}

                {/* Input */}
                <input
                    type={inputType}
                    className={`
                        w-full px-4 py-3 rounded-xl
                        bg-background border-2 
                        ${error ? 'border-destructive' : isFocused ? 'border-primary' : 'border-input'}
                        ${leftIcon ? 'pl-12' : ''}
                        ${(rightIcon || showPasswordToggle) ? 'pr-12' : ''}
                        text-foreground placeholder:text-muted-foreground
                        focus:outline-none focus:ring-4 focus:ring-primary/20
                        hover:border-primary/50
                        transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${className}
                    `}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />

                {/* Right Icon or Password Toggle */}
                {(showPasswordToggle || rightIcon) && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {showPasswordToggle ? (
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        ) : (
                            <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                {rightIcon}
                            </div>
                        )}
                    </div>
                )}

                {/* Focus Ring Animation */}
                {isFocused && (
                    <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse pointer-events-none" />
                )}
            </div>

            {/* Helper Text or Error */}
            {(helperText || error) && (
                <div className="flex items-start gap-2 text-sm animate-fade-in">
                    {error && <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                    <p className={error ? 'text-destructive' : 'text-muted-foreground'}>
                        {error || helperText}
                    </p>
                </div>
            )}
        </div>
    );
};
