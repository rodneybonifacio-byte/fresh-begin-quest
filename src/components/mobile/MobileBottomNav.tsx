import { Home, Package, Truck, Wallet, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
    isCenter?: boolean;
}

const navItems: NavItem[] = [
    { icon: Home, label: 'Início', path: '/app' },
    { icon: Package, label: 'Envios', path: '/app/emissao' },
    { icon: Truck, label: 'Rastrear', path: '/app/rastrear', isCenter: true },
    { icon: Wallet, label: 'Financeiro', path: '/app/financeiro/recarga' },
    { icon: Settings, label: 'Mais', path: '/app/ferramentas/integracoes' },
];

export const MobileBottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => {
        if (path === '/app') return location.pathname === '/app';
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden safe-area-bottom">
            <div className="flex items-end justify-around px-2 h-16 relative">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    
                    if (item.isCenter) {
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className="flex flex-col items-center justify-center -mt-4 relative"
                            >
                                <motion.div 
                                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg"
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ y: 0 }}
                                    animate={{ y: active ? -4 : 0 }}
                                >
                                    <Icon className="w-6 h-6 text-primary-foreground" />
                                </motion.div>
                                <span className="text-[10px] font-medium text-primary mt-1">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }
                    
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center py-2 px-3 min-w-[60px] relative"
                        >
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: active ? 1.1 : 1,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <Icon 
                                    className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} 
                                />
                            </motion.div>
                            <span 
                                className={`text-[10px] mt-1 font-medium ${
                                    active ? 'text-primary' : 'text-muted-foreground'
                                }`}
                            >
                                {item.label}
                            </span>
                            {active && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
