interface Config {
    siteName: string;
    phone: string;
    email: string;
    enderecoComercial?: string;
}

const config: Config = {
    siteName: import.meta.env.VITE_SITE_NAME || '',
    phone: import.meta.env.VITE_PHONE || '',
    email: import.meta.env.VITE_EMAIL || '',
    enderecoComercial: import.meta.env.VITE_ENDERECO_COMERCIAL || '',
};

export default config;
