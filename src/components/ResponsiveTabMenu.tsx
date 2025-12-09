import { useState } from "react";
import { ChevronDown, Package, Send, Truck, Clock, MapPin, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type TabItemType = {
    value: string;
    label: string;
    icon: React.ElementType;
    color: string;
};

type ResponsiveTabMenuProps = {
    tab: string;
    setTab: (value: string) => void;
    children: React.ReactNode;
};

const items: TabItemType[] = [
    { value: "PRE_POSTADO", label: "Pré-Postado", icon: Clock, color: "violet" },
    { value: "POSTADO", label: "Postado", icon: Send, color: "blue" },
    { value: "COLETADO", label: "Coletado", icon: Package, color: "cyan" },
    { value: "EM_TRANSITO", label: "Em Trânsito", icon: Truck, color: "amber" },
    { value: "AGUARDANDO_RETIRADA", label: "Aguard. Retirada", icon: MapPin, color: "orange" },
    { value: "EM_ATRASO", label: "Em Atraso", icon: AlertTriangle, color: "red" },
    { value: "ENTREGUE", label: "Entregue", icon: CheckCircle, color: "emerald" },
    { value: "CANCELADO", label: "Cancelado", icon: XCircle, color: "rose" },
];

const colorClasses: Record<string, { bg: string; text: string; activeBg: string; activeText: string; ring: string }> = {
    violet: { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", activeBg: "bg-violet-600", activeText: "text-white", ring: "ring-violet-600/20" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", activeBg: "bg-blue-600", activeText: "text-white", ring: "ring-blue-600/20" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-600 dark:text-cyan-400", activeBg: "bg-cyan-600", activeText: "text-white", ring: "ring-cyan-600/20" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-600", activeText: "text-white", ring: "ring-amber-600/20" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", activeBg: "bg-orange-600", activeText: "text-white", ring: "ring-orange-600/20" },
    red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", activeBg: "bg-red-600", activeText: "text-white", ring: "ring-red-600/20" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", activeBg: "bg-emerald-600", activeText: "text-white", ring: "ring-emerald-600/20" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-600 dark:text-rose-400", activeBg: "bg-rose-600", activeText: "text-white", ring: "ring-rose-600/20" },
};

export function ResponsiveTabMenu({ tab, setTab, children }: ResponsiveTabMenuProps) {
    const [showMenu, setShowMenu] = useState(false);

    const handleTabChange = (value: string) => {
        const currentUrl = new URL(window.location.href);
        const params = currentUrl.searchParams;
        if (value) {
            params.set("status", value);
        } else {
            params.delete("status");
        }
        window.history.pushState({}, "", currentUrl);
        setTab(value);
        setShowMenu(false);
    };

    const activeItem = items.find((item) => item.value === tab) || items[0];
    const ActiveIcon = activeItem.icon;
    const activeColors = colorClasses[activeItem.color];

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Mobile: Dropdown Button */}
            <div className="lg:hidden relative">
                <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card shadow-sm transition-all ${showMenu ? "ring-2 ring-primary/20" : ""}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeColors.activeBg}`}>
                            <ActiveIcon className={`h-4 w-4 ${activeColors.activeText}`} />
                        </div>
                        <span className="font-medium text-foreground">{activeItem.label}</span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Mobile Dropdown Menu */}
                {showMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                            {items.map((item) => {
                                const Icon = item.icon;
                                const colors = colorClasses[item.color];
                                const isActive = tab === item.value;

                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => handleTabChange(item.value)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 last:mb-0 ${
                                            isActive
                                                ? `${colors.activeBg} ${colors.activeText} shadow-md`
                                                : `hover:${colors.bg} text-foreground`
                                        }`}
                                    >
                                        <div className={`p-1.5 rounded-md ${isActive ? "bg-white/20" : colors.bg}`}>
                                            <Icon className={`h-4 w-4 ${isActive ? "text-current" : colors.text}`} />
                                        </div>
                                        <span className="font-medium text-sm">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop: Horizontal Tabs */}
            <div className="hidden lg:block">
                <div className="bg-card border border-border/50 rounded-2xl p-2 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const colors = colorClasses[item.color];
                            const isActive = tab === item.value;

                            return (
                                <button
                                    key={item.value}
                                    onClick={() => handleTabChange(item.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? `${colors.activeBg} ${colors.activeText} shadow-lg ring-4 ${colors.ring}`
                                            : `${colors.bg} ${colors.text} hover:shadow-md`
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">{children}</div>
        </div>
    );
}
