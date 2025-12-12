import { Package, Truck, Calculator, Wallet, FileText, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  route: string;
  color: string;
  bgColor: string;
}

export const MobileQuickActions = () => {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      icon: Package,
      label: "Emitir Etiqueta",
      route: "/app/emissao/adicionar",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: Calculator,
      label: "Simular Frete",
      route: "/app/simulador",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30"
    },
    {
      icon: Truck,
      label: "Meus Envios",
      route: "/app/emissao",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30"
    },
    {
      icon: Wallet,
      label: "Recarregar",
      route: "/app/financeiro/recarga",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30"
    },
    {
      icon: FileText,
      label: "Faturas",
      route: "/app/financeiro/faturas",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30"
    },
    {
      icon: MapPin,
      label: "Remetentes",
      route: "/app/remetentes",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/30"
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {quickActions.map((action, index) => (
        <button
          key={index}
          onClick={() => navigate(action.route)}
          className={`${action.bgColor} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all duration-200 min-h-[100px] border border-border/50`}
        >
          <div className={`${action.color} p-2 rounded-xl bg-white/80 dark:bg-background/80`}>
            <action.icon className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-foreground text-center leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};
