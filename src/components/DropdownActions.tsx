import { MoreVertical, X, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";

export interface ActionItem {
    label: string;
    icon?: JSX.Element;
    onClick?: () => void;
    to?: string;
    show?: boolean;
    loading?: boolean;
    disabled?: boolean;
}

interface DropdownActionsProps {
    id: string;
    actions: ActionItem[];
    title?: string; // Título identificador do registro
}


export const DropdownActions = ({ id, actions, title }: DropdownActionsProps) => {
    const [menuAberto, setMenuAberto] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        setMenuAberto(prev => {
            const willOpen = prev !== id;
            if (willOpen && dropdownRef.current) {
                // Verifica a posição do botão na tela
                const rect = dropdownRef.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const windowWidth = window.innerWidth;
                
                // Altura estimada do dropdown (máximo de 320px devido ao max-h-80)
                const maxDropdownHeight = 320; // max-h-80 = 20rem = 320px
                const estimatedHeight = Math.min(actions.length * 40 + 80, maxDropdownHeight);
                
                // Verifica espaço disponível
                const spaceBelow = windowHeight - rect.bottom - 20; // 20px de margem
                const spaceAbove = rect.top - 20; // 20px de margem
                
                // Decide se deve mostrar acima ou abaixo
                // Prioriza mostrar abaixo, mas só se houver espaço suficiente
                const shouldShowBelow = spaceBelow >= estimatedHeight || 
                                       (spaceBelow > spaceAbove && spaceBelow >= 150); // Mínimo de 150px
                
                // Calcula posição vertical
                let topPosition;
                if (shouldShowBelow) {
                    // Mostra abaixo do botão
                    topPosition = rect.bottom + 8;
                    // Verifica se não vai passar do limite inferior
                    if (topPosition + estimatedHeight > windowHeight) {
                        topPosition = windowHeight - estimatedHeight - 20;
                    }
                } else {
                    // Mostra acima do botão
                    topPosition = rect.top - estimatedHeight - 8;
                    // Verifica se não vai passar do limite superior
                    if (topPosition < 20) {
                        topPosition = 20;
                    }
                }
                
                // Calcula posição horizontal
                let rightPosition = windowWidth - rect.right + 12;
                // Verifica se o dropdown não vai sair da tela pela esquerda
                if (rect.right - 288 < 20) { // 288px é a largura do dropdown (w-72)
                    rightPosition = 20;
                }
                
                setDropdownPosition({
                    top: Math.max(20, Math.min(topPosition, windowHeight - estimatedHeight - 20)),
                    right: Math.max(20, rightPosition)
                });
            }
            return willOpen ? id : null;
        });
    };

    // Fechar dropdown quando clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Verifica se o clique foi no botão original ou no dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                // Verifica se o clique foi dentro do dropdown portal
                if (!dropdownPortalRef.current || !dropdownPortalRef.current.contains(target)) {
                    setMenuAberto(null);
                }
            }
        };

        // Fechar dropdown quando pressionar ESC
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuAberto(null);
            }
        };

        // Recalcular posição quando redimensionar a janela
        const handleResize = () => {
            if (menuAberto === id && dropdownRef.current) {
                const rect = dropdownRef.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const windowWidth = window.innerWidth;
                
                // Altura estimada do dropdown
                const maxDropdownHeight = 320;
                const estimatedHeight = Math.min(actions.length * 40 + 80, maxDropdownHeight);
                
                // Verifica espaço disponível
                const spaceBelow = windowHeight - rect.bottom - 20;
                const spaceAbove = rect.top - 20;
                
                // Decide se deve mostrar acima ou abaixo
                const shouldShowBelow = spaceBelow >= estimatedHeight || 
                                       (spaceBelow > spaceAbove && spaceBelow >= 150);
                
                // Calcula posição vertical
                let topPosition;
                if (shouldShowBelow) {
                    topPosition = rect.bottom + 8;
                    if (topPosition + estimatedHeight > windowHeight) {
                        topPosition = windowHeight - estimatedHeight - 20;
                    }
                } else {
                    topPosition = rect.top - estimatedHeight - 8;
                    if (topPosition < 20) {
                        topPosition = 20;
                    }
                }
                
                // Calcula posição horizontal
                let rightPosition = windowWidth - rect.right + 12;
                if (rect.right - 288 < 20) {
                    rightPosition = 20;
                }
                
                setDropdownPosition({
                    top: Math.max(20, Math.min(topPosition, windowHeight - estimatedHeight - 20)),
                    right: Math.max(20, rightPosition)
                });
            }
        };

        if (menuAberto === id) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleResize); // Recalcula também no scroll
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize);
        };
    }, [menuAberto, id, actions.length]);

    return (
        <div ref={dropdownRef} className="relative z-[99999]">
            <button
                onClick={toggleMenu}
                className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition flex items-center"
            >
                <MoreVertical size={20} />
            </button>

            {menuAberto === id && createPortal(
                <div 
                    ref={dropdownPortalRef}
                    data-dropdown-id={id}
                    className={`fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl rounded-lg p-3 w-72 animate-fade-in max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600`}
                    style={{ 
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`,
                        zIndex: 99999 
                    }}
                >
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">AÇÕES</span>
                            {title && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate" title={title}>
                                    {title}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setMenuAberto(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                            <X size={16} />
                        </button>
                    </div>

                    <ul className="space-y-2">
                        {actions
                            .filter(action => action.show !== false)
                            .map((action, idx) => (
                                <li key={idx}>
                                    {action.to ? (
                                        <Link
                                            to={action.to}
                                            className={`w-full text-left px-4 py-2 text-sm rounded-md bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-slate-300 flex items-center gap-2 ${
                                                action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                            onClick={(e) => action.disabled && e.preventDefault()}
                                        >
                                            {action.loading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                action.icon
                                            )}
                                            {action.label}
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (!action.disabled && !action.loading) {
                                                    action.onClick?.();
                                                    setMenuAberto(null);
                                                }
                                            }}
                                            disabled={action.disabled || action.loading}
                                            className={`w-full text-left px-4 py-2 text-sm rounded-md bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-slate-300 flex items-center gap-2 ${
                                                action.disabled || action.loading ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {action.loading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                action.icon
                                            )}
                                            {action.label}
                                        </button>
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
};
