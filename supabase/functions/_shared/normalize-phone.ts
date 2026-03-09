/**
 * Normaliza telefone brasileiro para formato padrão com 9° dígito.
 * 
 * Celulares brasileiros: 55 + DDD(2) + 9 + XXXX-XXXX = 13 dígitos
 * Sem o 9: 55 + DDD(2) + XXXX-XXXX = 12 dígitos
 * 
 * MessageBird às vezes retorna sem o 9° dígito. Esta função garante
 * que sempre temos o formato completo com 13 dígitos.
 */
export function normalizeBrazilianPhone(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, "");

  // Adicionar prefixo 55 se não tem
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }

  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
  // Números fixos brasileiros começam com 2-5, celulares com 6-9
  // Mas na prática, celulares modernos começam com 9 após o DDD
  if (digits.length === 12) {
    const ddd = digits.substring(2, 4);
    const localNumber = digits.substring(4);
    // Se o número local começa com 6,7,8,9 → é celular, adicionar 9
    const firstDigit = localNumber[0];
    if (["6", "7", "8", "9"].includes(firstDigit)) {
      digits = `55${ddd}9${localNumber}`;
    }
  }

  return digits;
}

/**
 * Gera variantes de um telefone para busca flexível.
 * Retorna o telefone normalizado + a versão sem o 9° dígito.
 */
export function phoneVariants(phone: string): string[] {
  const normalized = normalizeBrazilianPhone(phone);
  const variants = [normalized];

  // Se tem 13 dígitos (com o 9), também buscar sem
  if (normalized.length === 13) {
    const without9 = normalized.substring(0, 4) + normalized.substring(5);
    variants.push(without9);
  }

  // Sem prefixo 55
  if (normalized.startsWith("55")) {
    variants.push(normalized.substring(2));
  }

  return [...new Set(variants)];
}
