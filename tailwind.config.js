const { hover } = require('@testing-library/user-event/dist/cjs/convenience/hover.js');
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
        "./src/components/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'class', // Habilita dark mode com classe
    theme: {
        extend: {
            animation: {
                'fade-in': 'fadeIn 0.2s ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
            },
            fontFamily: {
                sans: 'Poppins, sans-serif',
            },
            fontSize: {
                xs: '0.75rem',    // 12px
                sm: '0.875rem',   // 14px
                base: '0.9375rem', // 15px ✅ (padrão 16px → agora 15px)
                lg: '1.125rem',   // 18px
                xl: '1.25rem',    // 20px
                // etc...
            },
            colors: {
                primary: {
                    DEFAULT: "#4b188b",
                    dark: "#6b21a8", // Versão mais clara para dark mode
                },
                secondary: {
                    DEFAULT: "#fe5b01",
                    dark: "#fb923c", // Versão mais clara para dark mode
                },
                btnhover: {
                    DEFAULT: "#682b91",
                    dark: "#7c3aed", // Versão mais clara para dark mode
                },
                disabled: {
                    DEFAULT: "#BEC4CD",
                    dark: "#4b5563", // Versão mais escura para dark mode
                },
                disabledSecondary: {
                    DEFAULT: "#172B4D",
                    dark: "#9ca3af", // Versão mais clara para dark mode
                },
                // Cores específicas para dark mode
                background: {
                    light: "#ffffff",
                    dark: "#0f172a", // slate-900
                },
                surface: {
                    light: "#f8fafc", // slate-50
                    dark: "#1e293b", // slate-800
                },
                card: {
                    light: "#ffffff",
                    dark: "#334155", // slate-700
                },
                text: {
                    primary: {
                        light: "#0f172a", // slate-900
                        dark: "#f1f5f9", // slate-100
                    },
                    secondary: {
                        light: "#475569", // slate-600
                        dark: "#cbd5e1", // slate-300
                    },
                    muted: {
                        light: "#64748b", // slate-500
                        dark: "#94a3b8", // slate-400
                    }
                },
                border: {
                    light: "#e2e8f0", // slate-200
                    dark: "#475569", // slate-600
                }
            }
        },
    },
    plugins: [],
};
