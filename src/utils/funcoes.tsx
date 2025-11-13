import axios from 'axios';

export const criarSlug = (texto: string): string => {
    return texto
        .toLowerCase() // Converte para minúsculas
        .normalize("NFD") // Normaliza acentos e caracteres especiais
        .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres não alfanuméricos
        .trim() // Remove espaços no início e no final
        .replace(/\s+/g, "-") // Substitui espaços por hifens
        .replace(/-+/g, "-"); // Remove múltiplos hifens consecutivos
}

// Função que recebe o erro (unknown) e retorna uma mensagem de erro adequada
export function getErrorMessage(error: unknown, defaultMessage = "Erro desconhecido ocorreu, tente novamente"): string {
    if (axios.isAxiosError(error)) {
        // Retorna a mensagem específica do backend ou a mensagem padrão
        return error.response?.data?.error || defaultMessage;
    }
    return defaultMessage;
}

export function truncateText(text: string, maxLength: number = 20): string {
    return text.length > maxLength
        ? text.slice(0, maxLength - 3) + '...'
        : text;
}

export function formatarNome(nomeCompleto: string): string {
    if (!nomeCompleto) return '';

    const partes = nomeCompleto.trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0];
    }

    if (partes.length === 2) {
        return `${partes[0]} ${partes[1]}`;
    }

    return `${partes[0]} ${partes[partes.length - 1]}...`;
}
