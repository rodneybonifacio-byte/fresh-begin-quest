import { Plus, TrendingUp, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileQuickActions } from "./MobileQuickActions";

export const MobileHomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-foreground/80 text-sm">Bem-vindo à</p>
            <h1 className="text-2xl font-bold text-primary-foreground">BRHUB Envios</h1>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Main CTA Button */}
        <button
          onClick={() => navigate('/app/emissao/adicionar')}
          className="w-full bg-white dark:bg-background text-primary font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
        >
          <Plus className="h-5 w-5" />
          <span>Emitir Nova Etiqueta</span>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 -mt-4">
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Acesso Rápido</h2>
          </div>
          <MobileQuickActions />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-green-700 dark:text-green-300">Economia</span>
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">Até 80%</p>
            <p className="text-xs text-green-600 dark:text-green-400">de desconto nos fretes</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-blue-700 dark:text-blue-300">Cobertura</span>
            </div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">Brasil todo</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">envie para qualquer lugar</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Atividade Recente</h2>
            <button 
              onClick={() => navigate('/app/emissao')}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 bg-muted rounded-full mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Seus envios recentes aparecerão aqui
            </p>
            <button 
              onClick={() => navigate('/app/emissao/adicionar')}
              className="mt-3 text-primary font-medium text-sm"
            >
              Criar primeiro envio
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-xl shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground">
                Nosso suporte está disponível 24/7 via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
