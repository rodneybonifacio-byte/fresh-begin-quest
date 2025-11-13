import { ArrowRightLeft, ChevronFirst, ChevronLast, LogOut, Settings, Shield, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import authStore from '../../authentica/authentication.store';
import { IconFavicon } from '../logo/IconFavicon';
import { SidebarItem } from './SidebarItem';

interface Props {
    navItems: any[];
    adminSection?: any[];
    isOpen?: boolean;
    onClose?: () => void;
    onNavigate?: (page: string) => void;
    title?: string;
}

export const SidebarLayout: React.FC<Props> = ({ navItems, adminSection, isOpen, onClose, onNavigate, title = 'Sistema' }) => {
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
            {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}

            <aside
                className={`fixed lg:relative z-50 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 overflow-hidden
                    ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-64`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 min-h-[72px] border-b border-sidebar-border">
                        <div className={`flex items-center space-x-2 ${isSidebarOpen ? 'lg:block' : 'lg:hidden'}`}>
                            <IconFavicon light title={title}/>
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

                    <nav className="flex-1 overflow-y-auto">
                        <ul className="py-4 space-y-1">
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

                        {/* Seção de Administração */}
                        {adminSection && adminSection.length > 0 && adminSection.map((section, sectionIdx) => (
                            <div key={sectionIdx} className="mt-6">
                                <div className={`px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${isSidebarOpen ? 'block' : 'lg:hidden'}`}>
                                    {section.section}
                                </div>
                                <ul className="py-2 space-y-1">
                                    {section.items.map((item: any, idx: number) => (
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
                            </div>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-sidebar-border">
                        <div className="relative">
                            <div
                                ref={accountButtonRef}
                                onClick={() => setShowAccountPopover(!showAccountPopover)}
                                className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-lg p-2 transition-all duration-200 hover-scale"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center relative">
                                        <span className="text-sm font-bold text-white">{avatar}</span>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full"></div>
                                        {isAdmin && (
                                            <div
                                                className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-sidebar rounded-full"
                                                title="Administrador"
                                            ></div>
                                        )}
                                    </div>
                                    <div className={`lg:${isSidebarOpen ? 'block' : 'hidden'}`}>
                                        <div className="text-sm font-medium text-sidebar-foreground">
                                            {userData?.name}
                                            {isAdmin && <span className="ml-1 text-xs text-primary font-normal">(Admin)</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{userData?.email}</div>
                                    </div>
                                </div>
                                <ArrowRightLeft
                                    className={`w-4 h-4 text-muted-foreground transition-transform ${showAccountPopover ? 'rotate-90' : ''} ${
                                        isSidebarOpen ? '' : 'lg:hidden'
                                    }`}
                                />
                            </div>

                            {/* Popover de troca de conta */}
                            {showAccountPopover &&
                                createPortal(
                                    <div
                                        className="fixed bg-card border border-border rounded-lg shadow-xl py-2 min-w-[280px] z-[70] animate-scale-in"
                                        style={{
                                            bottom: '80px',
                                            left: isSidebarOpen ? '20px' : '80px',
                                        }}
                                    >
                                        {/* Header */}
                                        <div className="px-4 py-2 border-b border-border">
                                            <h3 className="text-sm font-medium text-foreground">Trocar Conta</h3>
                                            <p className="text-xs text-muted-foreground">Selecione uma conta para conectar</p>
                                        </div>

                                        {/* Conta atual */}
                                        <div className="py-2">
                                            <div className="flex items-center space-x-3 px-4 py-3 bg-accent">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center relative">
                                                    <span className="text-sm font-bold text-white">{avatar}</span>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full"></div>
                                                    {isAdmin && (
                                                        <div
                                                            className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-sidebar rounded-full"
                                                            title="Administrador"
                                                        ></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-foreground">
                                                        {userData?.name}
                                                        {isAdmin && (
                                                            <span className="ml-1 text-xs text-primary font-normal">(Admin)</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{userData?.email}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Adicionar conta */}
                                        <div className="py-2 border-t border-border">
                                            <button
                                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent transition-colors text-primary"
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
                                            <div className="py-2 border-t border-border">
                                                {isInClientPanel && (
                                                    <button
                                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent transition-colors text-primary"
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
                                                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent transition-colors text-primary"
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
                                        <div className="border-t border-border pt-2">
                                            <button
                                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent transition-colors text-destructive"
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
                </div>
            </aside>
        </>
    );
};
