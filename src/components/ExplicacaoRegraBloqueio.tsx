import { Info } from "lucide-react";

export const ExplicacaoRegraBloqueio = () => {
    return (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Regra de bloqueio de créditos
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p>
                            Sempre que uma etiqueta é gerada, o valor do frete é <strong>bloqueado</strong> dos seus 
                            créditos e fica reservado para aquela etiqueta por até <strong>72 horas</strong>.
                        </p>
                        <p>
                            Enquanto a etiqueta estiver em status <strong>"pré-postado"</strong>, esse valor 
                            aparece como crédito bloqueado no seu extrato.
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>
                                Quando a etiqueta é <strong>postada</strong> (muda de status), o valor passa 
                                automaticamente para <strong>crédito consumido</strong>.
                            </li>
                            <li>
                                Se a etiqueta <strong>não for utilizada</strong> e continuar em "pré-postado" por 
                                mais de 72 horas, o bloqueio é cancelado e o valor <strong>volta para o seu saldo 
                                disponível</strong>.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
