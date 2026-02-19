import { ArrowRightLeft, ChevronFirst, ChevronLast, LogOut, Settings, Shield, UserPlus } from 'lucide-react';
import logoBrhub from '@/assets/logo-brhub-new.png';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import authStore from '../../authentica/authentication.store';
import { SidebarItem } from './SidebarItem';

interface Props {
    navItems: any[];
    isOpen?: boolean;
    onClose?: () => void;
    onNavigate?: (page: string) => void;
    title?: string;
    hideUserProfile?: boolean;
}

export const SidebarLayout: React.FC<Props> = ({ navItems, isOpen, onClose, onNavigate, hideUserProfile = false }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAccountPopover, setShowAccountPopover] = useState(false);
    const accountButtonRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarOpen = typeof isOpen !== 'undefined' ? isOpen : isSidebarOpen;

    const userData = authStore.getUser();
    const avatar =
        userData?.name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'US';

    // Verificar se o usuário é admin
    const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'administrator';
    // Verificar se está atualmente no painel admin
    const isInAdminPanel = location.pathname.startsWith('/admin');
    const isInClientPanel = location.pathname.startsWith('/app');

    const handleLogout = () => {
        localStorage.removeItem('token');
        authStore.logout();
        setShowAccountPopover(false);
        navigate('/');
    };

    return (
        <>
            <aside
                className={`fixed lg:relative z-50 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 overflow-hidden shadow-xl backdrop-blur-none
                    ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-64`}
                style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}
            >
                <div className="flex flex-col h-full bg-sidebar">
                    <div className="flex items-center justify-between p-6 min-h-[72px] border-b border-sidebar-border">
                        <div className={`flex items-center space-x-2 ${isSidebarOpen ? 'lg:block' : 'lg:hidden'}`}>
                            <img src={logoBrhub} alt="BRHUB Envios" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1 rounded-md hover:bg-accent text-primary hidden lg:block"
                        >
                            {isSidebarOpen ? <ChevronFirst className="w-5 h-5" /> : <ChevronLast className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-accent text-primary lg:hidden"
                        >
                            <ChevronFirst className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 bg-sidebar">
                        <ul className="space-y-1">
                            {navItems.map((item, idx) => (
                                <SidebarItem
                                    key={idx}
                                    {...item}
                                    isSidebarOpen={isSidebarOpen}
                                    onClick={() => onNavigate?.(item.label)}
                                    onItemClick={onNavigate}
                                    handleItemClick={onNavigate}
                                />
                            ))}
                        </ul>
                    </nav>

                    {!hideUserProfile && (
                    <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="relative">
                            <div
                                ref={accountButtonRef}
                                onClick={() => setShowAccountPopover(!showAccountPopover)}
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg p-2 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary dark:from-primary-dark dark:to-secondary-dark flex items-center justify-center relative">
                                        <span className="text-sm font-bold text-white">{avatar}</span>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                        {isAdmin && (
                                            <div
                                                className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-white dark:border-slate-900 rounded-full"
                                                title="Administrador"
                                            ></div>
                                        )}
                                    </div>
                                    <div className={`lg:${isSidebarOpen ? 'block' : 'hidden'}`}>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {userData?.name}
                                            {isAdmin && <span className="ml-1 text-xs text-purple-600 dark:text-purple-400 font-normal">(Admin)</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{userData?.email}</div>
                                    </div>
                                </div>
                                <ArrowRightLeft
                                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showAccountPopover ? 'rotate-90' : ''} ${
                                        isSidebarOpen ? '' : 'lg:hidden'
                                    }`}
                                />
                            </div>

                            {/* Popover de troca de conta */}
                            {showAccountPopover &&
                                createPortal(
                                    <div
                                        className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-2 min-w-[280px] z-[70]"
                                        style={{
                                            bottom: '80px',
                                            left: isSidebarOpen ? '20px' : '80px',
                                        }}
                                    >
                                        {/* Header */}
                                        <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Trocar Conta</h3>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">Selecione uma conta para conectar</p>
                                        </div>

                                        {/* Conta atual */}
                                        <div className="py-2">
                                            <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-slate-700">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary dark:from-primary-dark dark:to-secondary-dark flex items-center justify-center relative">
                                                    <span className="text-sm font-bold text-white">{avatar}</span>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                                    {isAdmin && (
                                                        <div
                                                            className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-white dark:border-slate-900 rounded-full"
                                                            title="Administrador"
                                                        ></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {userData?.name}
                                                        {isAdmin && (
                                                            <span className="ml-1 text-xs text-purple-600 dark:text-purple-400 font-normal">(Admin)</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">{userData?.email}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Adicionar conta */}
                                        <div className="py-2 border-t border-gray-200 dark:border-slate-700">
                                            <button
                                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-blue-600 dark:text-blue-400"
                                                onClick={() => {
                                                    setShowAccountPopover(false);
                                                    navigate('/');
                                                }}
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                <div className="text-left">
                                                    <div className="text-sm">Adicionar Conta</div>
                                                    <div className="text-xs opacity-75">Conectar uma nova conta</div>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Troca de painel - só aparece se for admin */}
                                        {isAdmin && (
                                            <div className="py-2 border-t border-gray-200 dark:border-slate-700">
                                                {isInClientPanel && (
                                                    <button
                                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-purple-600 dark:text-purple-400"
                                                        onClick={() => {
                                                            setShowAccountPopover(false);
                                                            navigate('/admin');
                                                        }}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        <div className="text-left">
                                                            <div className="text-sm">Painel Admin</div>
                                                            <div className="text-xs opacity-75">Ir para administração</div>
                                                        </div>
                                                    </button>
                                                )}

                                                {isInAdminPanel && (
                                                    <button
                                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-green-600 dark:text-green-400"
                                                        onClick={() => {
                                                            setShowAccountPopover(false);
                                                            navigate('/app');
                                                        }}
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                        <div className="text-left">
                                                            <div className="text-sm">Painel Cliente</div>
                                                            <div className="text-xs opacity-75">Ir para área do cliente</div>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Logout */}
                                        <div className="border-t border-gray-200 dark:border-slate-700 pt-2">
                                            <button
                                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-red-600 dark:text-red-400"
                                                onClick={handleLogout}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm">Sair da conta</span>
                                            </button>
                                        </div>
                                    </div>,
                                    document.body
                                )}

                            {/* Overlay para fechar popover quando clicar fora */}
                            {showAccountPopover && <div className="fixed inset-0 z-[60]" onClick={() => setShowAccountPopover(false)} />}
                        </div>
                    </div>
                    )}
                </div>
            </aside>
        </>
    );
};
