import Decimal from "decimal.js";

export function formatCurrency(input: string, withCents: boolean = true): string {
    const digits = input.replace(/\D/g, "");
    const value = Number(digits) / 100;
    return value.toLocaleString("pt-BR", {
        style: "decimal",
        minimumFractionDigits: withCents ? 2 : 0,
        maximumFractionDigits: withCents ? 2 : 0,
    });
}

export const formatCurrencyWithCents = (input: string): string => {
    const formatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(input));
    return formatado;
}

export function formatCurrencyDecimal(input: string): string {
    const digits = input.replace(/\D/g, "");
    return Number(digits).toLocaleString("pt-BR");
}

export function formatNumberString(input: string): string {
    return input.replace(/\./g, "").replace(",", ".");
}

export function formatarDecimalBR(valor: any, casasDecimais: number = 2): string {
    const numero = parseFloat(valor.toFixed(casasDecimais));
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais
    }).format(numero);
}

export const formatMoedaDecimal = (value: number) => {
    return Decimal(value).greaterThan(0) ?
        formatCurrencyWithCents(Decimal(value).toString())
        : 0
}

export const calcularLucro = (valorFaturado: number, valorCusto: number) => {
    return Decimal(valorFaturado).minus(Decimal(valorCusto)).greaterThan(0) ?
        formatCurrencyWithCents(Decimal(valorFaturado).minus(Decimal(valorCusto)).toString())
        : 0
}



