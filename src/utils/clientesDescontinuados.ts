// IDs de clientes com sistema descontinuado.
// Bloqueia login completo e impede emissão de etiquetas.
export const CLIENTES_DESCONTINUADOS: Record<string, string> = {
    '55eba391-6af9-458c-afd7-3a615470488e': '7 DAYS',
    '117025ab-6097-4959-94a0-ea3e95450bed': 'Cairo Imports',
    '7978f919-5b58-4801-8422-bac521956087': 'TG Griffes',
    'a1c137a5-4561-4379-b7b8-1b0bba9fad9b': 'TG Griffes',
    '6dc4c9ec-c814-4504-93d8-d4df01797b05': 'Brinca Brinca',
    'ca7ba912-9f51-4b7c-835c-ad6c92eb00b3': 'Look Power',
};

export function isClienteDescontinuado(clienteId?: string | null): boolean {
    if (!clienteId) return false;
    return Object.prototype.hasOwnProperty.call(CLIENTES_DESCONTINUADOS, clienteId);
}

export function getNomeClienteDescontinuado(clienteId?: string | null): string | null {
    if (!clienteId) return null;
    return CLIENTES_DESCONTINUADOS[clienteId] ?? null;
}
