import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

const navLinks = [
  { label: 'Programa', path: '/conecta' },
  { label: 'Simulador', path: '/programa' },
  { label: 'Home BRHUB', path: '/home' },
];

export const ConectaNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/conecta')} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg text-white">
            C+
          </div>
          <span className="text-xl font-bold text-gray-900">Conecta+</span>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.path)
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/conecta/login')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate('/conecta/cadastro')}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            Quero ser parceiro
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-gray-700 p-2">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-gray-100 px-4 pb-4"
        >
          <div className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                className={`text-left py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="flex gap-3 pt-3 mt-2 border-t border-gray-100">
              <button
                onClick={() => { navigate('/conecta/login'); setMobileOpen(false); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg border border-gray-200"
              >
                Entrar
              </button>
              <button
                onClick={() => { navigate('/conecta/cadastro'); setMobileOpen(false); }}
                className="flex-1 px-4 py-2.5 bg-orange-500 rounded-lg text-sm font-semibold text-white"
              >
                Ser parceiro
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};
