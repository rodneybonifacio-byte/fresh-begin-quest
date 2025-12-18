import { format, differenceInMinutes, isTomorrow, differenceInHours, differenceInDays, differenceInMonths, differenceInYears, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import moment from 'moment-timezone';
import type { IFatura } from '../types/IFatura';



/**
 * Função getStartOfMonth
 * 
 * Esta função retorna o primeiro dia do mês atual no formato 'YYYY-MM-DD'.
 * Ela não recebe nenhum parâmetro e utiliza a data atual como referência para calcular o início do mês.
 * 
 * Retorno:
 * - Uma string no formato 'YYYY-MM-DD', representando o primeiro dia do mês atual.
 */
const getStartOfMonth = (): string => {
    // Cria um objeto Date para a data de hoje
    const today = new Date();

    // Define o dia como o primeiro dia do mês atual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Obtém o mês da data. Se o mês for menor que 10, adiciona um zero à esquerda
    const month = startOfMonth.getMonth() + 1 < 10 ? `0${startOfMonth.getMonth() + 1}` : startOfMonth.getMonth() + 1;

    // Obtém o dia da data. O primeiro dia do mês será sempre '01'
    const day = '01';

    // Retorna a data formatada no formato 'YYYY-MM-DD'
    return `${startOfMonth.getFullYear()}-${month}-${day}`;
}

/**
 * Função getAdjustedDate
 * 
 * Esta função retorna uma data ajustada subtraindo um número específico de dias da data atual.
 * No ambiente de desenvolvimento, ela retorna uma data fixa.
 * 
 * Parâmetros:
 * - daysToSubtract (opcional): Número de dias a subtrair da data atual. Valor padrão é 0.
 * 
 * Retorno:
 * - Uma string no formato 'YYYY-MM-DD', representando a data ajustada.
 */
const getAdjustedDate = (daysToSubtract = 0) => {

    // Verifica se o ambiente é de desenvolvimento
    // Se estiver em desenvolvimento, retorna uma data fixa para facilitar testes
    // Cria um objeto Date com a data atual
    const date = new Date();

    // Subtrai o número de dias especificado pelo parâmetro `daysToSubtract` da data atual
    date.setDate(date.getDate() - daysToSubtract);

    // Obtém o ano da data ajustada
    const year = date.getFullYear();

    // Obtém o mês da data ajustada, adicionando um zero à esquerda se for necessário (para manter o formato 'MM')
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Obtém o dia da data ajustada, adicionando um zero à esquerda se for necessário (para manter o formato 'DD')
    const day = String(date.getDate()).padStart(2, "0");

    // Retorna a data formatada como 'YYYY-MM-DD'
    return `${year}-${month}-${day}`;
}

/**
 * Função getYesterday
 * 
 * Esta função retorna a data de ontem no formato 'YYYY-MM-DD'.
 * Ela não recebe nenhum parâmetro e utiliza a data atual como referência para calcular o dia anterior.
 * 
 * Retorno:
 * - Uma string no formato 'YYYY-MM-DD', representando a data de ontem.
 */
const getYesterday = () => {
    // Cria um objeto Date para a data de hoje
    const today = new Date();

    // Cria um novo objeto Date para a data de ontem, copiando a data de hoje
    const yesterday = new Date(today);

    // Subtrai um dia da data de ontem
    yesterday.setDate(today.getDate() - 1);

    // Obtém o mês da data de ontem. Se o mês for menor que 10, adiciona um zero à esquerda
    const month = yesterday.getMonth() + 1 < 10 ? `0${yesterday.getMonth() + 1}` : yesterday.getMonth() + 1;

    // Obtém o dia da data de ontem. Se o dia for menor que 10, adiciona um zero à esquerda
    const day = yesterday.getDate() < 10 ? `0${yesterday.getDate()}` : yesterday.getDate();

    // Retorna a data formatada no formato 'YYYY-MM-DD'
    return `${yesterday.getFullYear()}-${month}-${day}`;
}

/**
 * Função getToday
 * 
 * Esta função retorna a data de hoje no formato 'YYYY-MM-DD'.
 * Ela não recebe nenhum parâmetro e utiliza a data atual como referência para calcular o dia de hoje.
 * 
 * Retorno:
 * - Uma string no formato 'YYYY-MM-DD', representando a data de hoje.
 */
const getToday = (): string => {
    // Cria um objeto Date para a data de hoje
    const today = new Date();

    // Obtém o ano, mês e dia da data de hoje, formatando-os para dois dígitos onde necessário
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Retorna a data formatada como 'YYYY-MM-DD'
    return `${year}-${month}-${day}`;
}
function formatarDataPersonalizada(data: Date): string {
    const agora = new Date();
    const minutos = differenceInMinutes(agora, data);
    const horas = differenceInHours(agora, data);
    const dias = differenceInDays(agora, data);
    const meses = differenceInMonths(agora, data);
    const anos = differenceInYears(agora, data);

    if (isToday(data)) {
        if (minutos < 60) {
            return minutos === 0 ? 'agora' : `${minutos}m atrás`;
        }
        return `Há ${horas}h atrás`;
    }

    if (isYesterday(data)) {
        return `Ontem ${format(data, 'HH:mm')}`;
    }

    if (dias <= 7) {
        return `${format(data, 'EEEE HH:mm', { locale: ptBR })}`;
    }

    if (dias > 7 && dias <= 30) {
        return `${dias} dias ${format(data, 'dd/MM/yyyy HH:mm')}`;
    }

    if (meses >= 1 && anos < 1) {
        return `Há ${meses}mês ${format(data, 'dd/MM/yyyy HH:mm')}`;
    }

    if (anos >= 1) {
        return `Há ${anos}ano ${format(data, 'dd/MM/yyyy HH:mm')}`;
    }

    return format(data, 'dd/MM/yyyy HH:mm');
}

export const formatDate = (inptutData: string) => {
    const isoSemHora = inptutData.split('T')[0];
    const data = moment.tz(isoSemHora, 'America/Sao_Paulo').toDate();
    return format(data, 'dd/MM/yyyy');
}

export const formatDateLocalSystem = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const formatDateTime = (input: string | null | undefined, formatStr = 'dd/MM/yyyy HH:mm') => {
    if (!input) return '';

    let date: Date;

    if (input.includes('T')) {
        // Remove timezone offset (Z, +00:00, -03:00, etc.) e milissegundos
        const cleanInput = input
            .replace(/Z$/, '')
            .replace(/[+-]\d{2}:\d{2}$/, '')
            .replace(/\.\d+/, '');
        const [datePart, timePart = '00:00:00'] = cleanInput.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = '0'] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hour, minute, +second);
    } else {
        const [datePart, timePart = '00:00:00'] = input.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = '0'] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hour, minute, +second);
    }

    if (isNaN(date.getTime())) {
        console.warn(`Data inválida recebida: ${input}`);
        return input; // Retorna o input original em vez de lançar erro
    }

    return format(date, formatStr);
};


export function formatarDataVencimento(inptutData: string, dataPagamento?: string | null): JSX.Element {
    const hoje = new Date();

    const isoSemHora = inptutData.split('T')[0];
    const data = moment.tz(isoSemHora, 'America/Sao_Paulo').toDate();
    const dataFormatada = format(data, 'dd/MM/yyyy');

    // Se houver data de pagamento, mostra como "Pago em: ..."
    if (dataPagamento) {
        const dtPag = moment.tz(dataPagamento.split('T')[0], 'America/Sao_Paulo').toDate();
        const dtPagFormatada = format(dtPag, 'dd/MM/yyyy');
        return (
            <>
                <span>{dataFormatada}</span>
                <small className="text-green-600 font-medium">Pago em: {dtPagFormatada}</small>
            </>
        );
    }

    const diasDiferenca = differenceInDays(data, hoje);
    const diasAtraso = differenceInDays(hoje, data);

    let descricao: string | null = null;
    let classe = '';

    if (isToday(data)) {
        descricao = 'Vence hoje';
        classe = 'text-yellow-500';
    } else if (isTomorrow(data)) {
        descricao = 'Vence amanhã';
        classe = 'text-yellow-500';
    } else if (isYesterday(data)) {
        descricao = 'Venceu ontem';
        classe = 'text-red-500';
    } else if (diasAtraso > 0 && diasAtraso <= 30) {
        descricao = `Venceu há ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}`;
        classe = 'text-red-500';
    } else {
        const anos = differenceInYears(hoje, data);
        const meses = differenceInMonths(hoje, data) - anos * 12;

        if (anos >= 1) {
            const textoAno = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
            const textoMes = meses > 0 ? ` e ${meses} ${meses === 1 ? 'mês' : 'meses'}` : '';
            descricao = `Venceu há ${textoAno}${textoMes}`;
            classe = 'text-red-500';
        } else if (meses >= 1) {
            descricao = `Venceu há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
            classe = 'text-red-500';
        } else if (diasDiferenca <= 3 && diasDiferenca > 1) {
            descricao = `Vence em ${diasDiferenca} dias`;
            classe = 'text-yellow-500';
        }
    }

    return (
        <>
            <span>{dataFormatada}</span>
            {descricao && (
                <span className={`text-xs font-medium ${classe}`}>
                    {descricao}
                </span>
            )}
        </>
    );
}

export const estaAtrasada = (fatura: IFatura) => {
    const hoje = new Date();
    const dataVencimento = new Date(fatura.dataVencimento);
    return dataVencimento < hoje && fatura.status === 'PENDENTE';
};


export {
    getStartOfMonth,
    getAdjustedDate,
    getYesterday,
    getToday,
    formatarDataPersonalizada
}
