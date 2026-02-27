import { useFetchQuery } from '../../../../hooks/useFetchQuery';
import { OrdemColetaService } from '../../../../services/OrdemColetaService';
import type { IEmissaoOrdemColeta } from '../../../../types/emissao/IEmissaoOrdemColeta';
import type { IResponse } from '../../../../types/IResponse';
import { LoadSpinner } from '../../../../components/loading';
import { MapPin, Package, Phone, Clock, Truck, RefreshCw, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Calcula as datas de filtro inteligentes para coleta:
 * - Seg-Sex antes das 15h: hoje e ontem
 * - Sex após 15h, Sáb, Dom: desde sexta-feira
 */
const calcularDatasColeta = (): { dataIni: string; dataFim: string; descricaoPeriodo: string } => {
    const now = new Date();
    const dia = now.getDay(); // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sab
    const hora = now.getHours();

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const hoje = formatDate(now);

    // Sexta após 15h, Sábado ou Domingo
    const isFimDeSemanaOuSextaTarde = dia === 0 || dia === 6 || (dia === 5 && hora >= 15);

    if (isFimDeSemanaOuSextaTarde) {
        // Calcular a última sexta-feira
        let diasAtesSexta: number;
        if (dia === 5) diasAtesSexta = 0; // é sexta
        else if (dia === 6) diasAtesSexta = 1; // sábado -> sexta = -1
        else diasAtesSexta = 2; // domingo -> sexta = -2

        const sexta = new Date(now);
        sexta.setDate(now.getDate() - diasAtesSexta);

        return {
            dataIni: formatDate(sexta),
            dataFim: hoje,
            descricaoPeriodo: `Sexta (${formatDate(sexta)}) até hoje`,
        };
    }

    // Dias normais (Seg-Sex antes das 15h): hoje e ontem
    const ontem = new Date(now);
    ontem.setDate(now.getDate() - 1);

    return {
        dataIni: formatDate(ontem),
        dataFim: hoje,
        descricaoPeriodo: `Ontem e Hoje (${formatDate(ontem)} - ${hoje})`,
    };
};

const PainelColeta: React.FC = () => {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const service = new OrdemColetaService();
    const datas = useMemo(() => calcularDatasColeta(), []);

    const { data: ordemColeta, isLoading } = useFetchQuery<IResponse<IEmissaoOrdemColeta[]>>(
        ['painelColeta', datas.dataIni, datas.dataFim],
        async () => await service.getWithParams({ dataIni: datas.dataIni, dataFim: datas.dataFim }),
        { refetchInterval: 60000 * 2 } // auto-refresh 2min
    );

    const totalObjetos = useMemo(() => {
        if (!ordemColeta?.data) return 0;
        return ordemColeta.data.reduce((acc, o) => acc + (parseInt(o.totalObjeto) || 0), 0);
    }, [ordemColeta]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ['painelColeta'] });
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const coletas = ordemColeta?.data || [];

    return (
        <div className="flex flex-col gap-4 pb-8">
            {isLoading && <LoadSpinner mensagem="Carregando coletas..." />}

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-secondary/10 dark:bg-secondary-dark/20 rounded-lg">
                            <Truck className="w-6 h-6 text-secondary dark:text-secondary-dark" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                                Painel de Coleta
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {datas.descricaoPeriodo}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        aria-label="Atualizar"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Clientes</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{coletas.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Objetos</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalObjetos}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Coletas */}
            {coletas.length === 0 && !isLoading && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
                    <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma coleta pendente</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Período: {datas.descricaoPeriodo}</p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {coletas.map((ordem, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        {/* Card header com cliente e badge */}
                        <div className="p-4 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-bold text-primary dark:text-primary-dark truncate">
                                    {ordem.cliente}
                                </h2>
                            </div>
                            <span className="flex-shrink-0 bg-secondary dark:bg-secondary-dark text-white px-3 py-1 rounded-full text-sm font-bold">
                                {ordem.totalObjeto} obj
                            </span>
                        </div>

                        {/* Info rows */}
                        <div className="px-4 pb-3 flex flex-col gap-2.5">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {ordem.localColeta || 'Local não informado'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {ordem.responsavel || 'Responsável não informado'}
                                </span>
                            </div>
                        </div>

                        {/* Footer com horário */}
                        <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2.5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-secondary dark:text-secondary-dark" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {ordem.dataHoraColeta || 'Horário não definido'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PainelColeta;
