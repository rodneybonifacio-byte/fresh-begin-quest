import { Sun, Moon, ChevronDown, User, LogOut, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import authStore from '../../authentica/authentication.store';
import { useTheme } from '../../providers/ThemeContext';
import { ProfileAvatar } from '../ProfileAvatar';

export const MobileHeader = observer(() => {
    const { theme, toggleTheme } = useTheme();
    const [showProfilePopover, setShowProfilePopover] = useState(false);
    const profileButtonRef = useRef<HTMLButtonElement>(null);
    const suppressClickRef = useRef(false);
    const navigate = useNavigate();

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
            console.log('[MobileHeader] toggleProfilePopover ->', next);
            return next;
        });
    };

    const handleProfileTouchEnd: React.TouchEventHandler<HTMLButtonElement> = (e) => {
        // Importante: abrir no TouchEnd evita o "abre e fecha" (o overlay pode capturar o clique após o TouchStart)
        suppressClickRef.current = true;
        toggleProfilePopover(e);
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 450);
    };

    const handleProfileClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
        if (suppressClickRef.current) return;
        toggleProfilePopover(e);
    };

    useEffect(() => {
        console.log('[MobileHeader] showProfilePopover =', showProfilePopover);
    }, [showProfilePopover]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        authStore.logout();
        setShowProfilePopover(false);
        navigate('/');
    };

    return (
        <>
            <header className="sticky top-0 z-[100] isolate bg-background border-b border-border lg:hidden pointer-events-auto">
                <div className="flex items-center justify-between px-4 h-14">
                    {/* Left side - Logo */}
                    <Link to="/app" className="flex items-center">
                        <span className="text-xl font-bold text-primary">BRHUB</span>
                    </Link>

                    {/* Right side - actions */}
                    <div className="flex items-center space-x-2">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-accent transition-colors"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-primary" />
                            ) : (
                                <Moon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </button>

                        {/* Profile */}
                        <div className="relative z-[110] pointer-events-auto">
                            <button
                                type="button"
                                ref={profileButtonRef}
                                aria-haspopup="menu"
                                aria-expanded={showProfilePopover}
                                onTouchEnd={handleProfileTouchEnd}
                                onClick={handleProfileClick}
                                className="flex items-center space-x-1 cursor-pointer hover:bg-accent active:bg-accent/80 rounded-full p-3 transition-colors touch-manipulation select-none"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <ProfileAvatar name={userInfo.name} size="sm" />
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Profile Popover */}
            <AnimatePresence>
                {showProfilePopover && createPortal(
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[150] touch-manipulation"
                            role="presentation"
                            aria-hidden="true"
                            onClick={() => {
                                console.log('[MobileHeader] overlay close');
                                setShowProfilePopover(false);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="fixed right-4 top-16 bg-card border border-border rounded-xl shadow-xl py-2 min-w-[220px] z-[200] touch-manipulation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header do perfil */}
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <ProfileAvatar name={userInfo.name} size="md" />
                                        {isAdmin && (
                                            <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-purple-500 border-2 border-card rounded-full" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-card-foreground">
                                            {userInfo.name}
                                            {isAdmin && (
                                                <span className="ml-1 text-xs text-purple-500 font-normal">
                                                    (Admin)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {userInfo.email}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="py-2">
                                <Link
                                    to="/app/profile"
                                    className="flex items-center space-x-3 px-4 py-2.5 hover:bg-accent active:bg-accent/80 transition-colors text-card-foreground touch-manipulation"
                                    onClick={() => setShowProfilePopover(false)}
                                >
                                    <User className="w-4 h-4" />
                                    <span className="text-sm">Meu Perfil</span>
                                </Link>
                            </div>

                            {/* Admin Option */}
                            {isAdmin && (
                                <div className="py-2 border-t border-border">
                                    <button
                                        type="button"
                                        className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-accent active:bg-accent/80 transition-colors text-purple-600 dark:text-purple-400 touch-manipulation"
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

                            {/* Logout */}
                            <div className="border-t border-border pt-2">
                                <button
                                    type="button"
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-accent active:bg-accent/80 transition-colors text-destructive touch-manipulation"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm">Sair</span>
                                </button>
                            </div>
                        </motion.div>
                    </>,
                    document.body
                )}
            </AnimatePresence>
        </>
    );
});
