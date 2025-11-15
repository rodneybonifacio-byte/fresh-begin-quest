import { Menu, Search, ChevronDown, Sun, Moon, User, Settings, LogOut } from 'lucide-react';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../../authentica/authentication.store';
import { useTheme } from '../../providers/ThemeContext';
const AppTopbar = observer(({
  toggleSidebar
}: {
  toggleSidebar: () => void;
}) => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dados do usuário logado - obtidos do store de autenticação
  const userData = authStore.getUser();
  const userInfo = {
    name: userData?.name || 'Usuário',
    email: userData?.email || 'usuario@exemplo.com',
    avatar: userData?.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US'
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    authStore.logout();
    setShowProfilePopover(false);
    navigate('/');
  };
  return <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                {/* Left side - menu button and logo on mobile */}
                <div className="flex items-center space-x-4">
                    <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-accent lg:hidden">
                        <Menu className="w-5 h-5 text-foreground" />
                    </button>

                    <div className="flex lg:hidden items-center">
                       
                    </div>
                </div>

                {/* Right side - search, theme toggle and user */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64" />
                    </div>

                    {/* Theme toggle button */}
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-accent transition-colors" title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
                    </button>

                    {/* Botão de perfil */}
                    <div className="relative">
                        <div ref={profileButtonRef} onClick={() => setShowProfilePopover(!showProfilePopover)} className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded-lg p-2 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{userInfo.avatar}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                        </div>

                        {/* Popover de perfil */}
                        {showProfilePopover && createPortal(<div className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-2 min-w-[220px] z-[70]" style={{
            top: '60px',
            right: '20px'
          }}>
                                {/* Header do perfil */}
                                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-sm font-bold text-white">{userInfo.avatar}</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {userInfo.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                                {userInfo.email}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu do perfil */}
                                <div className="py-2">
                                    <Link to="/app/profile" className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-slate-300" onClick={() => setShowProfilePopover(false)}>
                                        <User className="w-4 h-4" />
                                        <span className="text-sm">Meu Perfil</span>
                                    </Link>
                                    
                                    <Link to="/app/configuracoes" className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-slate-300" onClick={() => setShowProfilePopover(false)}>
                                        <Settings className="w-4 h-4" />
                                        <span className="text-sm">Configurações</span>
                                    </Link>
                                </div>

                                {/* Footer do perfil */}
                                <div className="border-t border-gray-200 dark:border-slate-700 pt-2">
                                    <button className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-red-600 dark:text-red-400" onClick={handleLogout}>
                                        <LogOut className="w-4 h-4" />
                                        <span className="text-sm">Sair</span>
                                    </button>
                                </div>
                            </div>, document.body)}
                    </div>

                    {/* Overlay para fechar popover quando clicar fora */}
                    {showProfilePopover && <div className="fixed inset-0 z-[60]" onClick={() => setShowProfilePopover(false)} />}
                </div>
            </div>
        </header>;
});
export default AppTopbar;