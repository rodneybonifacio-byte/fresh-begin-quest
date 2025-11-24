import React from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  isConnected,
  lastUpdate,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      {isConnected ? (
        <>
          <div className="relative flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Monitoramento Ativo
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
            Desconectado
          </span>
        </>
      )}
      
      {lastUpdate && isConnected && (
        <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 ml-2">
          Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </span>
      )}
    </div>
  );
};
