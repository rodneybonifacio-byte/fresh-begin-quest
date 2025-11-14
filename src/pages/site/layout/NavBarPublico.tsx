import { Link } from "react-router-dom"
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
        <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center py-3">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-primary">BRHUB</span>
                            <span className="text-2xl font-semibold text-foreground">Envios</span>
                        </Link>
                    </div>
                    <div className="hidden lg:flex items-center space-x-6">
                        <Link to="/" className="py-2 px-4 text-foreground hover:text-primary font-medium transition duration-300">Home</Link>
                        {showMenuRastreio && (
                            <Link to="/rastreio/encomenda" className="py-2 px-4 text-foreground hover:text-primary font-medium transition duration-300">Rastreio</Link>
                        )}
                        
                        {/* Botão de toggle do tema */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-foreground hover:text-primary rounded-lg hover:bg-muted transition duration-300"
                            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {showMenuCadastro && (
                            <Link to="/cadastro" className="border-2 border-primary text-primary py-2 px-6 rounded-full font-semibold hover:bg-primary/10 transition duration-300">Cadastre-se</Link>
                        )}
                        {showMenuLogin && (
                            <Link to="/login" className="bg-primary text-primary-foreground py-2 px-6 rounded-full font-semibold hover:bg-primary/90 transition duration-300 shadow-md">Login</Link>
                        )}
                    </div>
                    <div className="lg:hidden flex items-center space-x-2">
                        {/* Botão de toggle do tema - mobile */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-foreground hover:text-primary rounded-lg hover:bg-muted transition duration-300"
                            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button onClick={() => setMenuOpen(!menuOpen)} className="text-foreground focus:outline-none">
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
                    <div className={`absolute left-0 top-0 h-full w-80 bg-card shadow-xl transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex flex-col h-full">
                            {/* Header do menu */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-primary">BRHUB</span>
                                    <span className="text-2xl font-semibold text-foreground">Envios</span>
                                </div>
                                <button
                                    onClick={() => setMenuOpen(false)}
                                    className="p-2 text-foreground hover:text-primary rounded-lg hover:bg-muted transition duration-300"
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
                                    className="py-3 px-4 text-foreground hover:text-primary hover:bg-muted rounded-lg transition duration-300 font-medium"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Home
                                </Link>

                                {showMenuRastreio && (
                                    <Link
                                        to="/rastreio/encomenda"
                                        className="py-3 px-4 text-foreground hover:text-primary hover:bg-muted rounded-lg transition duration-300 font-medium"
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
                                    className="flex items-center gap-3 py-3 px-4 text-foreground hover:text-primary hover:bg-muted rounded-lg transition duration-300 w-full text-left font-medium"
                                >
                                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                                </button>
                            </div>

                            {/* Botões de ação no final */}
                            <div className="p-4 border-t border-border space-y-3">
                                {showMenuCadastro && (
                                    <Link
                                        to="/cadastro"
                                        className="block w-full border-2 border-primary text-primary py-3 px-6 rounded-full hover:bg-primary/10 transition duration-300 text-center font-semibold"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Cadastre-se
                                    </Link>
                                )}
                                {showMenuLogin && (
                                    <Link
                                        to="/login"
                                        className="block w-full bg-primary text-primary-foreground py-3 px-6 rounded-full hover:bg-primary/90 transition duration-300 text-center font-semibold shadow-md"
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
