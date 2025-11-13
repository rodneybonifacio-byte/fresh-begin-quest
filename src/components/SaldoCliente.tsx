import { Eye, EyeOff } from "lucide-react";
import { useFetchQuery } from "../hooks/useFetchQuery";
import { useAuth } from "../providers/AuthContext";
import { ClienteService } from "../services/ClienteService";
import { useState } from "react";
import { formatCurrencyWithCents } from "../utils/formatCurrency";

export const SaldoCliente = () => {
    const [isOpenSaldo, setIsOpenSaldo] = useState(false);
    const service = new ClienteService();
    const { user } = useAuth()

    const { data } = useFetchQuery<{ saldo: number } | null>(
        ['cliente-logado'],
        async () => {

            if (!user?.clienteId) {
                return null;
            }
            const result = (await service.obterSaldo(user?.clienteId ?? '')).data;
            return result ?? null;
        }
    );

    const saldo = formatCurrencyWithCents(data?.saldo.toString() || "0") ?? 0;

    const handlerIsOpenSaldo = () => {
        setIsOpenSaldo((prev) => !prev);
    }

    return (
        <div className="flex text-slate-800 font-semibold flex-col sm:items-end">
            <div className="text-lg font-semibold text-slate-800 sm:justify-center items-center flex flex-row">
                <span className="text-sm text-slate-400">Saldo</span>
                {isOpenSaldo ? (
                    <Eye className="w-4 h-4 text-slate-400 inline-block ml-1 cursor-pointer" onClick={handlerIsOpenSaldo} />
                ) : (
                    <EyeOff className="w-4 h-4 text-slate-400 inline-block ml-1 cursor-pointer" onClick={handlerIsOpenSaldo} />
                )}
            </div>
            <span>{isOpenSaldo ? "****" : `${saldo}`}</span>
        </div>
    );
};
