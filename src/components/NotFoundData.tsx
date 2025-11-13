import { AlertOctagon, RefreshCw } from "lucide-react";

export const NotFoundData = () => {
    return (
        <div className="flex flex-col justify-center items-center min-h-[400px] text-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/20">
            <div className="flex flex-col justify-center items-center gap-6 max-w-md">
                {/* Ícone com animação */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-white dark:bg-slate-800 p-6 rounded-full shadow-xl border border-slate-200 dark:border-slate-600">
                        <AlertOctagon 
                            size={48} 
                            className="text-orange-500 dark:text-orange-400 drop-shadow-sm" 
                        />
                    </div>
                </div>

                {/* Título */}
                <div className="space-y-3">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Ops! Nenhum dado encontrado
                    </h3>
                    
                    {/* Descrição */}
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        Nenhum dado corresponde aos critérios selecionados.<br />
                        Tente ajustar os filtros ou verificar novamente.
                    </p>
                </div>

                {/* Sugestões */}
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-600 w-full">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <RefreshCw size={16} className="text-blue-500 dark:text-blue-400" />
                        Sugestões:
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 text-left">
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                            Verifique os filtros aplicados
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                            Tente termos de busca diferentes
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                            Limpe todos os filtros e tente novamente
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}