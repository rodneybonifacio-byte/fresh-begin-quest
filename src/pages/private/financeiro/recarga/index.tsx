import { useState } from "react";
import { useAuth } from "../../../../providers/AuthContext";
import { CreditoService } from "../../../../services/CreditoService";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { Wallet, Plus, History, TrendingUp, DollarSign } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { toastSuccess, toastError } from "../../../../utils/toastNotify";

export default function Recarga() {
    const { user } = useAuth();
    const creditoService = new CreditoService();
    const queryClient = useQueryClient();
    const { setIsLoading } = useLoadingSpinner();
    const [valorRecarga, setValorRecarga] = useState("");

    const { data: saldo } = useFetchQuery<number>(
        ['cliente-saldo-recarga'],
        async () => {
            if (!user?.clienteId) return 0;
            return await creditoService.calcularSaldo(user?.clienteId);
        }
    );

    const addCreditoMutation = useMutation({
        mutationFn: async (valor: number) => {
            if (!user?.clienteId) throw new Error("Cliente não encontrado");
            return await creditoService.registrarRecarga(
                user.clienteId,
                valor,
                'Recarga manual via plataforma'
            );
        },
        onSuccess: () => {
            toastSuccess("Crédito adicionado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['cliente-saldo-recarga'] });
            queryClient.invalidateQueries({ queryKey: ['cliente-logado'] });
            setValorRecarga("");
            setIsLoading(false);
        },
        onError: (error: any) => {
            toastError(error?.message || "Erro ao adicionar crédito");
            setIsLoading(false);
        }
    });

    const handleAddCredito = () => {
        const valor = parseFloat(valorRecarga.replace(/\D/g, "")) / 100;
        if (valor <= 0) {
            toastError("Valor inválido");
            return;
        }
        setIsLoading(true);
        addCreditoMutation.mutate(valor);
    };

    const formatInputCurrency = (value: string) => {
        const digits = value.replace(/\D/g, "");
        const amount = parseFloat(digits) / 100;
        return amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setValorRecarga(value);
    };

    const saldoAtual = formatCurrencyWithCents(saldo?.toString() || "0");

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Recarga de Créditos</h1>
                        <p className="text-muted-foreground">Adicione créditos à sua carteira</p>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Saldo Atual Card */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <DollarSign className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Saldo Atual</span>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{saldoAtual}</p>
                    </div>

                    {/* Total Recarregado */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Total Recarregado</span>
                        </div>
                        <p className="text-3xl font-bold text-foreground">R$ 0,00</p>
                    </div>

                    {/* Média de Recarga */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <History className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Última Recarga</span>
                        </div>
                        <p className="text-3xl font-bold text-foreground">-</p>
                    </div>
                </div>

                {/* Recarga Form */}
                <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Plus className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Adicionar Créditos</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Valor da Recarga
                            </label>
                            <input
                                type="text"
                                value={valorRecarga ? formatInputCurrency(valorRecarga) : ""}
                                onChange={handleInputChange}
                                placeholder="R$ 0,00"
                                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-foreground text-lg"
                            />
                        </div>

                        {/* Valores Sugeridos */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3">Valores Sugeridos</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[50, 100, 200, 500].map((valor) => (
                                    <button
                                        key={valor}
                                        onClick={() => setValorRecarga((valor * 100).toString())}
                                        className="px-4 py-3 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground font-semibold transition-colors"
                                    >
                                        R$ {valor},00
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleAddCredito}
                            disabled={!valorRecarga || parseFloat(valorRecarga.replace(/\D/g, "")) === 0}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Adicionar Créditos
                        </button>
                    </div>
                </div>

                {/* Informações */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Informações sobre Recarga
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Os créditos são adicionados instantaneamente à sua carteira</li>
                        <li>• Utilize os créditos para pagar suas faturas e envios</li>
                        <li>• Os créditos não possuem prazo de validade</li>
                        <li>• Para solicitar reembolso, entre em contato com o suporte</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
