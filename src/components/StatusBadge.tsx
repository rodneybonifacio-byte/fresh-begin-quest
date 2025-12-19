interface StatusBadgeProps {
    status: string;
    tipo: "envio" | "faturamento" | "ativo";
}

const statusEnvioColors: Record<string, string> = {
    ABERTO: "bg-yellow-100 text-yellow-800",
    PRE_POSTADO: "bg-blue-100 text-blue-800",
    POSTADO: "bg-indigo-100 text-indigo-800",
    EM_TRANSITO: "bg-cyan-100 text-cyan-800",
    COLETADO: "bg-purple-100 text-purple-800",
    SAIU_PARA_ENTREGA: "bg-teal-100 text-teal-800",
    AGUARDANDO_RETIRADA: "bg-orange-100 text-orange-800",
    EM_ATRASO: "bg-red-200 text-red-900",
    ENTREGUE: "bg-green-100 text-green-800",
    DEVOLVIDO: "bg-slate-200 text-slate-800",
    EXTRAVIADO: "bg-fuchsia-100 text-fuchsia-800",
    EXPIRADO: "bg-gray-300 text-gray-700",
    CANCELADO: "bg-red-100 text-red-800",
};

const statusFaturamentoColors: Record<string, string> = {
    ABERTO: "bg-blue-100 text-blue-800",
    FATURAR: "bg-red-100 text-red-800",
    FATURADO: "bg-green-100 text-green-800",
    PENDENTE: "bg-yellow-100 text-yellow-800",
    PAGO: "bg-green-100 text-green-800",
    CANCELADO: "bg-red-100 text-red-800",
};

const statusAtivoColors: Record<string, string> = {
    ATIVO: "bg-green-100 text-green-800",
    INATIVO: "bg-red-100 text-red-800",
}

export const StatusBadge = ({ status, tipo }: StatusBadgeProps) => {

    let colors: Record<string, string>;
    switch (tipo) {
        case "envio":
            colors = statusEnvioColors;
            break;
        case "faturamento":
            colors = statusFaturamentoColors;
            break;
        case "ativo":
            colors = statusAtivoColors;
            break;
        default:
            colors = statusEnvioColors;
            break;
    }
    const style = colors[status.toUpperCase()] || "bg-gray-100 text-gray-600";
    return (
        <span className={`rounded text-center  w-fit inline-block text-[10px] font-semibold uppercase ${style} px-2 py-1`}>
            {status.replace("_", " ")}
        </span>
    );
};
