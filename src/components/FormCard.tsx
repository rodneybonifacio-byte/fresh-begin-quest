import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface FormCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}

export const FormCard = ({ 
    title, 
    description, 
    icon: Icon, 
    children, 
    className = ""
}: FormCardProps) => {
    return (
        <div 
            className={`
                group
                bg-card border-2 border-border rounded-2xl shadow-lg
                hover:shadow-2xl hover:border-primary/30
                transition-all duration-300
                overflow-hidden
                ${className}
            `}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border p-5">
                <div className="flex items-start gap-4">
                    {Icon && (
                        <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-1">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 animate-fade-in">
                {children}
            </div>
        </div>
    );
};
