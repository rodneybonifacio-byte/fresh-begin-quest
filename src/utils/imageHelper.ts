/**
 * Helper para carregar imagens de transportadoras
 * Mapeia o nome da transportadora para o caminho da imagem correspondente
 */

export const getTransportadoraImage = (nomeTransportadora: string): string => {
    if (!nomeTransportadora) {
        return "/assets/images/logolight.svg"; // fallback padrão
    }

    const nome = nomeTransportadora.toLowerCase().trim();
    
    // Mapeamento de transportadoras para suas respectivas imagens
    const imageMap: { [key: string]: string } = {
        // Correios
        'sedex': '/assets/images/correios.png',
        'pac': '/assets/images/correios.png',
        'correios': '/assets/images/correios.png',
        
        // Transportadoras principais
        'rodonaves': '/assets/images/rodonaves.png',
        'jadlog': '/assets/images/jadlog.png',
        'total': '/assets/images/total.png',
        'tnt': '/assets/images/tnt.png',
        'fedex': '/assets/images/fedex.png',
        'dhl': '/assets/images/dhl.png',
        'ups': '/assets/images/ups.png',
        'loggi': '/assets/images/loggi.png',
        'mercadoenvios': '/assets/images/mercadoenvios.png',
        'shopee': '/assets/images/shopee.png',
        'azul': '/assets/images/azul.png',
        'gol': '/assets/images/gol.png',
        'tam': '/assets/images/tam.png',
        'latam': '/assets/images/latam.png',
        'transportadora': '/assets/images/transportadora.png',
    };

    // Procura por correspondência exata primeiro
    if (imageMap[nome]) {
        return imageMap[nome];
    }

    // Procura por correspondência parcial
    for (const [key, imagePath] of Object.entries(imageMap)) {
        if (nome.includes(key)) {
            return imagePath;
        }
    }

    // Fallback se não encontrar correspondência
    return "/assets/images/logolight.svg";
};

/**
 * Função auxiliar para obter o alt text da imagem
 */
export const getTransportadoraAltText = (nomeTransportadora: string): string => {
    return `Logo ${nomeTransportadora || 'da transportadora'}`;
};

/**
 * Função auxiliar para verificar se a imagem existe
 * Pode ser útil para implementar verificação de existência no futuro
 */
export const checkImageExists = async (imagePath: string): Promise<boolean> => {
    try {
        const response = await fetch(imagePath, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
};
