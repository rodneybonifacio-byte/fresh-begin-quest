import { useState } from "react";
import { Package, MapPin, Truck, CreditCard, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import FormularioEmissao from "./FormularioEmissao";

export const ModernEmissaoWrapper = () => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { icon: Package, label: "Pacote", description: "Dimensões e peso" },
        { icon: MapPin, label: "Destino", description: "Endereço de entrega" },
        { icon: Truck, label: "Frete", description: "Escolha o serviço" },
        { icon: CreditCard, label: "Confirmar", description: "Revisar e emitir" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Header com Progress Stepper */}
            <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    {/* Mobile: Compact Progress */}
                    <div className="lg:hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-foreground">Nova Etiqueta</h1>
                            <span className="text-sm font-medium text-muted-foreground">
                                Etapa {currentStep + 1} de {steps.length}
                            </span>
                        </div>
                        
                        {/* Mobile Progress Bar */}
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            >
                                <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
                            </div>
                        </div>

                        {/* Current Step Info */}
                        <div className="mt-4 flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                {(() => {
                                    const StepIcon = steps[currentStep].icon;
                                    return <StepIcon className="h-5 w-5 text-primary" />;
                                })()}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{steps[currentStep].label}</p>
                                <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Full Stepper */}
                    <div className="hidden lg:block">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            {steps.map((step, index) => {
                                const StepIcon = step.icon;
                                const isActive = index === currentStep;
                                const isCompleted = index < currentStep;
                                
                                return (
                                    <div key={index} className="flex items-center flex-1">
                                        {/* Step Circle */}
                                        <div className="flex flex-col items-center gap-2 relative">
                                            <div
                                                className={`
                                                    relative w-14 h-14 rounded-full flex items-center justify-center
                                                    transition-all duration-500 transform
                                                    ${isActive
                                                        ? 'bg-primary shadow-2xl shadow-primary/50 scale-110'
                                                        : isCompleted
                                                        ? 'bg-primary/80'
                                                        : 'bg-muted'
                                                    }
                                                `}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 className="h-6 w-6 text-white animate-scale-in" />
                                                ) : (
                                                    <StepIcon
                                                        className={`h-6 w-6 transition-colors ${
                                                            isActive ? 'text-white' : 'text-muted-foreground'
                                                        }`}
                                                    />
                                                )}
                                                
                                                {/* Active Ring */}
                                                {isActive && (
                                                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="text-center">
                                                <p
                                                    className={`text-sm font-semibold transition-colors ${
                                                        isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {step.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{step.description}</p>
                                            </div>
                                        </div>

                                        {/* Connector Line */}
                                        {index < steps.length - 1 && (
                                            <div className="flex-1 mx-4 h-1 relative overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`absolute left-0 top-0 h-full bg-primary transition-all duration-500 ease-out ${
                                                        isCompleted ? 'w-full' : 'w-0'
                                                    }`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    {/* Formulário com animação */}
                    <div className="animate-fade-in">
                        <FormularioEmissao />
                    </div>
                </div>
            </div>

            {/* Floating Action Buttons (Mobile Only) */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50 flex gap-3">
                {currentStep > 0 && (
                    <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        className="flex-1 bg-card border-2 border-border text-foreground py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                
                {currentStep < steps.length - 1 && (
                    <button
                        onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                        className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                        Próximo
                        <ArrowRight className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};
