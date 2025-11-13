import { Link } from "react-router-dom"
import { LogoApp } from "../../../components/logo"
import { useState } from "react";
import { AlignLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "../../../providers/ThemeContext";

interface NavBarPublicoProps {
    showMenuCadastro?: boolean;
    showMenuLogin?: boolean;
    showMenuRastreio?: boolean;
}

export const NavBarPublico = ({ showMenuLogin = true, showMenuCadastro = true, showMenuRastreio = true }: NavBarPublicoProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    
    return (
        <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center">
                        <LogoApp light />
                    </div>
                    <div className="hidden lg:flex items-center space-x-4">
                        <Link to="/" className="py-2 px-4 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition duration-300">Home</Link>
                        {showMenuRastreio && (
                            <Link to="/rastreio/encomenda" className="py-2 px-4 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition duration-300">Rastreio</Link>
                        )}
                        
                        {/* Botão de toggle do tema */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-300"
                            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {showMenuCadastro && (
                            <Link to="/manutencao" className="border border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-500 py-2 px-6 rounded-lg hover:bg-orange-700/10 dark:hover:bg-orange-500/10 transition duration-300">Cadastre-se</Link>
                        )}
                        {showMenuLogin && (
                            <Link to="/login" className="bg-orange-600 dark:bg-orange-500 text-white py-2 px-6 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300">Login</Link>
                        )}
                    </div>
                    <div className="lg:hidden flex items-center space-x-2">
                        {/* Botão de toggle do tema - mobile */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-300"
                            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600 dark:text-gray-300 focus:outline-none">
                            <AlignLeft className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Sidemenu Mobile */}
                <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => setMenuOpen(false)}
                    />

                    {/* Menu lateral */}
                    <div className={`absolute left-0 top-0 h-full w-80 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex flex-col h-full">
                            {/* Header do menu */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
                                <div className="flex items-center">
                                    <LogoApp light />
                                </div>
                                <button
                                    onClick={() => setMenuOpen(false)}
                                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Links do menu */}
                            <div className="flex-1 flex flex-col space-y-2 p-4">
                                <Link
                                    to="/"
                                    className="py-3 px-4 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition duration-300"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Home
                                </Link>

                                {showMenuRastreio && (
                                    <Link
                                        to="/rastreio/encomenda"
                                        className="py-3 px-4 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition duration-300"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Rastreio
                                    </Link>
                                )}

                                {/* Botão de toggle do tema no menu */}
                                <button
                                    onClick={() => {
                                        toggleTheme();
                                        setMenuOpen(false);
                                    }}
                                    className="flex items-center gap-3 py-3 px-4 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition duration-300 w-full text-left"
                                >
                                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                                </button>
                            </div>

                            {/* Botões de ação no final */}
                            <div className="p-4 border-t border-gray-200 dark:border-slate-600 space-y-3">
                                {showMenuCadastro && (
                                    <Link
                                        to="/manutencao"
                                        className="block w-full border border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-500 py-3 px-6 rounded-lg hover:bg-orange-700/10 dark:hover:bg-orange-500/10 transition duration-300 text-center"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Cadastre-se
                                    </Link>
                                )}
                                {showMenuLogin && (
                                    <Link
                                        to="/login"
                                        className="block w-full bg-orange-600 dark:bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition duration-300 text-center"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}