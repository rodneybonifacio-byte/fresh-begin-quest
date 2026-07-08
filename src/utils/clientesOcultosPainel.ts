/**
 * Clientes que NÃO devem aparecer no Painel de Coleta.
 * Ex.: possuem outra empresa fazendo a coleta.
 */
const NOMES_OCULTOS = ['LOOK POWER', 'LOOKPOWER', 'PLANET', 'PLANETA CAT', 'ABC SPACE', 'ABCSPACE'];

export function isClienteOcultoPainel(nome?: string | null): boolean {
    if (!nome) return false;
    const n = nome
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    return NOMES_OCULTOS.some(oculto => n.includes(oculto));
}
