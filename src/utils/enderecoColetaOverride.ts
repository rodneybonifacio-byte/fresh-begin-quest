/**
 * Sobrescreve endereço de coleta para clientes específicos do painel.
 * Retorna null quando não há override (usar endereço original).
 */
export function getEnderecoColetaOverride(nomeCliente?: string | null): string | null {
    if (!nomeCliente) return null;
    const nome = nomeCliente
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    if (nome.includes('7 DAYS') || nome.includes('7DAYS') || nome.includes('SEVEN DAYS')) {
        return 'R. Barão de Ladário, 402 - Shoppings 25 - Brás, São Paulo - SP, 03010-000 — Box BTC 55 / Super Grifes';
    }

    if (nome.includes('BRHUB')) {
        return 'Rua Xavantes, 719 - 7º Andar';
    }

    return null;
}
