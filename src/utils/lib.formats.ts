export function formatTelefone(inputValue: string, tipo?: 'telefone' | 'celular'): string {
    const digits = inputValue.replace(/\D/g, '');
    if (!digits) return '';

    let formatted = '';

    if (digits.length <= 2) {
        // Apenas DDD (ou parcial), sem parenteses
        return digits;
    }

    const ddd = digits.slice(0, 2);
    const restante = digits.slice(2);

    formatted = `(${ddd})`;

    if (tipo === 'telefone') {
        if (restante.length <= 4) {
            formatted += ` ${restante}`;
        } else {
            formatted += ` ${restante.slice(0, 4)}-${restante.slice(4, 8)}`;
        }
    } else if (tipo === 'celular') {
        if (restante.length <= 5) {
            formatted += ` ${restante}`;
        } else {
            formatted += ` ${restante.slice(0, 1)} ${restante.slice(1, 5)}-${restante.slice(5, 9)}`;
        }
    } else {
        // auto
        if (restante.length <= 4) {
            formatted += ` ${restante}`;
        } else if (restante.length <= 8) {
            formatted += ` ${restante.slice(0, 4)}-${restante.slice(4)}`;
        } else {
            formatted += ` ${restante.slice(0, 1)} ${restante.slice(1, 5)}-${restante.slice(5, 9)}`;
        }
    }

    return formatted.trim();
}

export function formatPeso(inputValue: string): string {
    const valorLimpo = inputValue.replace(/\D/g, '');
    const valorPreenchido = valorLimpo.padStart(3, '0');
    const gramas = valorPreenchido.slice(-3);
    let quilogramas = valorPreenchido.slice(0, -3) || '0';
    quilogramas = quilogramas.replace(/^0+/, '') || '0';
    return `${quilogramas},${gramas}`;
}

export function formatCep(inputValue: string): string {
    let v = inputValue.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    return v;
}

export function formatMoney(inputValue: string): string {
    let v = inputValue.replace(/\D/g, '');
    v = (Number(v) / 100).toLocaleString('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
    });

    return v;
}

export function formatCpfCnpj(inputValue: string): string {
    const digits = inputValue.replace(/\D/g, '');
    if (digits.length <= 11) {
        let v = digits.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return v;
    } else {
        let v = digits.slice(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        return v;
    }
}

export function removeNegativo(valor: string | number): number {
    const valorStr = String(valor);
    const valorSemSinal = valorStr.replace('-', '');
    return Number(valorSemSinal);
}

export function formatarNumero(valor: number) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(valor);
}
