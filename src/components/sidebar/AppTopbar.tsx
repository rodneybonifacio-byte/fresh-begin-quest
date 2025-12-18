import { Menu, Search, ChevronDown, Sun, Moon, User, LogOut, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import authStore from '../../authentica/authentication.store';
import { useTheme } from '../../providers/ThemeContext';
import { ProfileAvatar } from '../ProfileAvatar';

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
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Dados do usuário logado - obtidos do store de autenticação
  const userData = authStore.getUser();
  const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'administrator';
  
  const userInfo = {
    name: userData?.name || 'Usuário',
    email: userData?.email || 'usuario@exemplo.com',
  };

  const toggleProfilePopover = (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowProfilePopover((prev) => {
      const next = !prev;
      console.log('[AppTopbar] toggleProfilePopover ->', next);
      return next;
    });
  };

  useEffect(() => {
    console.log('[AppTopbar] showProfilePopover =', showProfilePopover);
  }, [showProfilePopover]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    authStore.logout();
    setShowProfilePopover(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left side - menu button (mobile only) */}
        <div className="flex items-center space-x-4">
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-accent lg:hidden">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Right side - search, theme toggle and user */}
        <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64" 
            />
          </div>

          {/* Theme toggle button */}
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-accent transition-colors" 
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>

          {/* Botão de perfil */}
          <div className="relative">
            <button
              type="button"
              ref={profileButtonRef}
              aria-haspopup="menu"
              aria-expanded={showProfilePopover}
              onClick={toggleProfilePopover}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent active:bg-accent/80 rounded-lg p-2 transition-colors touch-manipulation"
            >
              <ProfileAvatar name={userInfo.name} size="sm" />
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Overlay para fechar popover quando clicar fora - ANTES do popover */}
          {showProfilePopover && (
            <div
              className="fixed inset-0 z-[60] touch-manipulation"
              role="presentation"
              aria-hidden="true"
              onClick={() => {
                console.log('[AppTopbar] overlay close');
                setShowProfilePopover(false);
              }}
            />
          )}

          {/* Popover de perfil - z-index maior que overlay */}
          {showProfilePopover && createPortal(
            <div 
              className="fixed bg-white dark:bg-slate-800 border border-border rounded-lg shadow-xl py-2 min-w-[220px] z-[70] touch-manipulation"
              style={{ top: '60px', right: '20px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do perfil */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <ProfileAvatar name={userInfo.name} size="md" />
                    {isAdmin && (
                      <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-popover rounded-full" title="Administrador" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-popover-foreground">
                      {userInfo.name}
                      {isAdmin && <span className="ml-1 text-xs text-purple-500 font-normal">(Admin)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {userInfo.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu do perfil */}
              <div className="py-2">
                <Link 
                  to="/app/profile" 
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-accent active:bg-accent/80 transition-colors text-popover-foreground touch-manipulation" 
                  onClick={() => setShowProfilePopover(false)}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Meu Perfil</span>
                </Link>
              </div>

              {/* Opção de Admin */}
              {isAdmin && (
                <div className="py-2 border-t border-border">
                  <button 
                    type="button"
                    className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent active:bg-accent/80 transition-colors text-purple-600 dark:text-purple-400 touch-manipulation"
                    onClick={() => {
                      setShowProfilePopover(false);
                      navigate('/admin');
                    }}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Painel Admin</span>
                  </button>
                </div>
              )}

              {/* Footer do perfil */}
              <div className="border-t border-border pt-2">
                <button 
                  type="button"
                  className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-accent active:bg-accent/80 transition-colors text-destructive touch-manipulation" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sair</span>
                </button>
              </div>
            </div>, 
            document.body
          )}
        </div>
      </div>
    </header>
  );
});

export default AppTopbar;