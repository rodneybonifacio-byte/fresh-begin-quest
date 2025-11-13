import clsx from "clsx";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLoadingSpinner } from "../../providers/LoadingSpinnerContext";
import type { IRastreioResponse } from "../../types/rastreio/IRastreio";
import { Content } from "../private/Content";
import { FormularioRastreio } from "../private/rastreio/FormularioRastreio";
import { ListaHistoricoRastreio } from "../private/rastreio/ListaHistoricoRastreio";
import { NavBarPublico } from "./layout/NavBarPublico";

export const RastreioPublica = () => {
    const [searchParams] = useSearchParams();
    const numeroObjeto = searchParams.get("objeto") || searchParams.get("codigo") || "";

    const { setIsLoading } = useLoadingSpinner();
    const [isResultRastreio, setIsResultRastreio] = useState(true);
    const [rastreio, setRastreio] = useState<IRastreioResponse | undefined>();

    return (
        <div className="w-full bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
            <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
                <NavBarPublico showMenuLogin={false} showMenuCadastro={false} showMenuRastreio={false}  />
            </header>
            <main className={clsx("transition-all duration-300 w-full p-6 mx-auto h-auto max-w-7xl bg-white dark:bg-slate-900")}> 
                <Content titulo="Rastreio de encomendas" subTitulo="Fique atento ao status da sua encomenda">
                    <FormularioRastreio
                        numeroObjeto={numeroObjeto}
                        setIsLoading={setIsLoading}
                        setIsResultRastreio={setIsResultRastreio}
                        setRastreio={setRastreio}
                        origem="publica"
                    />
                    {isResultRastreio && rastreio && (
                        <div className="flex justify-center flex-col gap-4 ">
                            <ListaHistoricoRastreio historicoRastreios={rastreio} />
                        </div>
                    )}
                </Content>
            </main>
        </div>
    );
};
