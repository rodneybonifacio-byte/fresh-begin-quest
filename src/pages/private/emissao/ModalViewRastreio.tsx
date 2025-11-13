import React from "react";
import { X } from "lucide-react";
import { ListaHistoricoRastreio } from "../rastreio/ListaHistoricoRastreio";
import type { IRastreioResponse } from "../../../types/rastreio/IRastreio";

interface ModalViewRastreioProps {
    isOpen: boolean;
    rastreio: IRastreioResponse | undefined;
    onCancel?: () => void;
}

export const ModalViewRastreio: React.FC<ModalViewRastreioProps> = ({ isOpen, rastreio, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative flex flex-col gap-4 w-full max-w-[600px] max-h-[80vh] bg-white p-6 rounded-md overflow-y-auto">
        
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-800">Rastreio de ecomendas</h1>
                    <X className="cursor-pointer text-slate-500" onClick={onCancel} />
                </div>

                <ListaHistoricoRastreio historicoRastreios={rastreio} />
            </div>
        </div>

    );
};
