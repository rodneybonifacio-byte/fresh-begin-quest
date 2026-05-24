import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
    nomeCliente?: string | null;
    onLogout: () => void;
}

export const SistemaDescontinuadoBlock = ({ nomeCliente, onLogout }: Props) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
            <div className="max-w-lg w-full rounded-2xl border border-border bg-card shadow-2xl p-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3">
                    Sistema descontinuado
                </h1>
                {nomeCliente && (
                    <p className="text-sm text-muted-foreground mb-2">
                        Conta: <span className="font-semibold text-foreground">{nomeCliente}</span>
                    </p>
                )}
                <p className="text-base text-muted-foreground mb-6">
                    O acesso a esta conta foi descontinuado. A emissão de etiquetas e demais
                    funcionalidades não estão mais disponíveis.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                    Para mais informações, entre em contato com o suporte BRHUB.
                </p>
                <Button onClick={onLogout} variant="outline" className="w-full">
                    Sair
                </Button>
            </div>
        </div>
    );
};
