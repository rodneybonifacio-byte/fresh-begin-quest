// Formatação de horários no fuso de São Paulo (BRT/BRST), independente do fuso do navegador.
// Evita que máquinas em UTC (ou VPNs em outros fusos) mostrem horários deslocados no CRM.

const TZ = 'America/Sao_Paulo';

function safeDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatTimeBRT(input: string | Date | null | undefined): string {
  const d = safeDate(input);
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTimeBRT(input: string | Date | null | undefined): string {
  const d = safeDate(input);
  if (!d) return '';
  return d.toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
