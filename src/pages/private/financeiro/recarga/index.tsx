import { useState } from "react";
import { useAuth } from "../../../../providers/AuthContext";
import { CreditoService } from "../../../../services/CreditoService";
import { RecargaPixService } from "../../../../services/RecargaPixService";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { formatCurrencyWithCents } from "../../../../utils/formatCurrency";
import { Wallet, Plus, History, TrendingUp, DollarSign, QrCode, Gift, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";
import { toastSuccess, toastError } from "../../../../utils/toastNotify";
import { ModalRecargaPix } from "./ModalRecargaPix";
import { ICreatePixChargeResponse } from "../../../../types/IRecargaPix";
import { useRecargaPixRealtime } from "../../../../hooks/useRecargaPixRealtime";
import { useNavigate } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";

export default function Recarga() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const creditoService = new CreditoService();
  const queryClient = useQueryClient();
  const { setIsLoading } = useLoadingSpinner();
  const [valorRecarga, setValorRecarga] = useState("");
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixChargeData, setPixChargeData] = useState<ICreatePixChargeResponse['data']>();

  const { data: saldo, refetch: refetchSaldo } = useFetchQuery<number>(
    ['cliente-saldo-recarga'],
    async () => {
      if (!user?.clienteId) return 0;
      return await creditoService.calcularSaldo(user?.clienteId);
    },
    { refetchOnWindowFocus: true, staleTime: 0 }
  );

  const { data: ultimaRecarga } = useFetchQuery(['ultima-recarga'], async () => {
    const recargas = await RecargaPixService.buscarRecargas(10);
    const ultimaPaga = recargas.find(r => r.status === 'pago');
    return ultimaPaga || null;
  }, { refetchOnWindowFocus: true, staleTime: 0 });

  const { data: totalRecarregado } = useFetchQuery(['total-recarregado'], async () => {
    const recargas = await RecargaPixService.buscarRecargas(1000);
    const total = recargas.filter(r => r.status === 'pago').reduce((sum, r) => sum + Number(r.valor), 0);
    return total;
  }, { refetchOnWindowFocus: true, staleTime: 0 });

  useRecargaPixRealtime({
    enabled: true,
    onPaymentConfirmed: () => {
      setShowPixModal(false);
      setPixChargeData(undefined);
      refetchSaldo();
      queryClient.invalidateQueries({ queryKey: ['ultima-recarga'] });
      queryClient.invalidateQueries({ queryKey: ['total-recarregado'] });
    }
  });

  const createPixChargeMutation = useMutation({
    mutationFn: async (valor: number) => {
      return await RecargaPixService.criarCobrancaPix({ valor, expiracao: 3600 });
    },
    onSuccess: response => {
      if (response.success && response.data) {
        setPixChargeData(response.data);
        setShowPixModal(true);
        toastSuccess("Cobrança PIX gerada com sucesso!");
      } else {
        let errorMessage = "Erro ao gerar cobrança PIX";
        if (response.error?.includes('Certificados')) {
          errorMessage = "Erro de configuração dos certificados. Contate o suporte.";
        } else if (response.error?.includes('Configuração incompleta')) {
          errorMessage = "Sistema não configurado corretamente. Contate o administrador.";
        } else if (response.error?.includes('autenticação')) {
          errorMessage = "Falha na autenticação com Banco Inter. Tente novamente.";
        } else if (response.error?.includes('criar cobrança')) {
          errorMessage = "Não foi possível gerar a cobrança PIX. Tente novamente.";
        } else if (response.error) {
          errorMessage = response.error;
        }
        toastError(errorMessage);
      }
      setIsLoading(false);
    },
    onError: (error: any) => {
      let errorMessage = "Erro ao gerar cobrança PIX";
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toastError(errorMessage);
      setIsLoading(false);
    }
  });

  const handleGeneratePixCharge = () => {
    const valor = parseFloat(valorRecarga.replace(/\D/g, "")) / 100;
    if (valor <= 0) {
      toastError("Valor inválido");
      return;
    }
    if (valor < 1) {
      toastError("Valor mínimo de R$ 1,00");
      return;
    }
    setIsLoading(true);
    createPixChargeMutation.mutate(valor);
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
    setValorRecarga(e.target.value);
  };

  const saldoAtual = formatCurrencyWithCents(saldo?.toString() || "0");

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Clean & Modern */}
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Recarga</h1>
              <p className="text-xs text-muted-foreground">Adicione créditos</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/app/financeiro/recarga/historico')} 
            className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center"
          >
            <History className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-32">
        {/* Saldo Card - Hero Style */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm opacity-90">Saldo Disponível</span>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">{saldoAtual}</p>
          <p className="text-xs opacity-75">
            Última recarga: {ultimaRecarga?.data_pagamento 
              ? formatInTimeZone(new Date(ultimaRecarga.data_pagamento), "America/Sao_Paulo", "dd/MM 'às' HH:mm") 
              : "Nenhuma"}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total Recarregado</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrencyWithCents((totalRecarregado || 0).toString())}
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/app/financeiro/recarga/historico')}
            className="bg-card border border-border rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <History className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Histórico</p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">Ver tudo</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Promo Banner - Compact Mobile */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Promoção Especial!</p>
              <p className="text-white/90 text-xs">
                Coloque <span className="font-bold">R$ 100</span> e ganhe <span className="font-bold">R$ 50</span> extra!
              </p>
            </div>
            <button 
              onClick={() => setValorRecarga((100 * 100).toString())}
              className="flex-shrink-0 px-3 py-2 bg-white text-orange-600 font-bold text-sm rounded-lg"
            >
              Pegar
            </button>
          </div>
        </div>

        {/* Recarga Form */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Adicionar Créditos</h2>
          </div>

          {/* Valor Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Valor da Recarga
            </label>
            <input 
              type="text" 
              value={valorRecarga ? formatInputCurrency(valorRecarga) : ""} 
              onChange={handleInputChange} 
              placeholder="R$ 0,00" 
              className="w-full px-4 py-4 bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-foreground text-xl font-bold text-center"
            />
          </div>

          {/* Quick Values */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Valores Rápidos</p>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map(valor => (
                <button 
                  key={valor} 
                  onClick={() => setValorRecarga((valor * 100).toString())} 
                  className={`relative px-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                    valor === 100 
                      ? 'bg-orange-500 text-white border-2 border-orange-500' 
                      : 'bg-muted/50 border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  R${valor}
                  {valor === 100 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Gift className="w-2.5 h-2.5 text-yellow-800" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Generate PIX Button */}
          <button 
            onClick={handleGeneratePixCharge} 
            disabled={!valorRecarga || parseFloat(valorRecarga.replace(/\D/g, "")) === 0}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Gerar QR Code PIX
          </button>
        </div>

        {/* Info Section - Compact */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Sobre a Recarga
          </h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• Créditos adicionados instantaneamente</li>
            <li>• Utilize para pagar faturas e envios</li>
            <li>• Créditos não expiram</li>
          </ul>
        </div>
      </div>

      {/* Modal PIX */}
      <ModalRecargaPix 
        isOpen={showPixModal} 
        onClose={() => {
          setShowPixModal(false);
          setValorRecarga("");
          queryClient.invalidateQueries({ queryKey: ['cliente-saldo-recarga'] });
          queryClient.invalidateQueries({ queryKey: ['recargas-historico'] });
        }} 
        chargeData={pixChargeData} 
        saldoInicial={saldo || 0} 
        clienteId={user?.clienteId || ''} 
      />
    </div>
  );
}
