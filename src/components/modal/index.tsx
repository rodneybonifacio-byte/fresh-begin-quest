import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { tv } from "tailwind-variants";

type ModalProps = {
    title: string;
    description?: string | null;
    children: ReactNode;
    onCancel: () => void;
    size?: "small" | "medium" | "large";
};

// Variantes de tamanho
const modalVariants = tv({
    base: "relative w-full max-h-[85vh] rounded-xl bg-[#FEFEFE] dark:bg-slate-800 shadow-shape p-6 overflow-y-auto",
    variants: {
        size: {
            small: "sm:w-[90%] md:w-[50%] lg:w-[30%]",
            medium: "sm:w-[90%] md:w-[70%] lg:w-[40%]",
            large: "sm:w-[95%] md:w-[85%] lg:w-[70%]",
        },
    },
    defaultVariants: {
        size: "medium",
    },
});

export const ModalCustom = ({
    children,
    onCancel,
    title,
    description,
    size = "medium",
}: ModalProps) => {

    useEffect(() => {
        document.body.classList.add("body-no-scroll");
        return () => {
            document.body.classList.remove("body-no-scroll");
        }
    }, [])
    
    return (
        <div className="fixed inset-0 z-50 p-4 bg-slate-700/60 text-slate-800 dark:text-slate-100 flex items-center justify-center overflow-y-auto">
            <div className={modalVariants({ size })}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-between">
                        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex flex-col">
                            {title}
                            {description && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
                            )}
                        </h1>
                        <X className="cursor-pointer text-slate-500 dark:text-slate-400" onClick={onCancel} />
                    </div>
                    <div className="overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
