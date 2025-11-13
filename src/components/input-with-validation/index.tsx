import { AlertCircle, CheckCircle } from 'lucide-react';
import React from 'react';
import type { FieldError } from 'react-hook-form';

interface InputWithValidationProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: FieldError | string;
    hasValue?: boolean;
    containerClassName?: string;
}

export const InputWithValidation = React.forwardRef<HTMLInputElement, InputWithValidationProps>(
    ({ label, error, hasValue, containerClassName = '', className = '', ...props }, ref) => {
        const errorMessage = typeof error === 'string' ? error : error?.message;
        const hasError = !!errorMessage;
        const isValid = hasValue && !hasError;

        return (
            <div className={containerClassName}>
                {label && (
                    <label className="text-sm font-medium text-foreground mb-2 block">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        className={`w-full h-11 px-4 pr-10 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-colors ${
                            hasError
                                ? 'border-destructive focus:ring-destructive'
                                : isValid
                                ? 'border-green-500 focus:ring-green-500'
                                : 'border-input focus:ring-ring'
                        } ${className}`}
                        {...props}
                    />
                    {hasValue && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {hasError ? (
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                        </div>
                    )}
                </div>
                {errorMessage && (
                    <span className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorMessage}
                    </span>
                )}
            </div>
        );
    }
);

InputWithValidation.displayName = 'InputWithValidation';
