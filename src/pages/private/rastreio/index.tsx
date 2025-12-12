import { useState } from "react";
import { FormularioRastreio } from "./FormularioRastreio";
import { ListaHistoricoRastreio } from "./ListaHistoricoRastreio";
import type { IRastreioResponse } from "../../../types/rastreio/IRastreio";
import { Content } from "../Content";
import { useLoadingSpinner } from "../../../providers/LoadingSpinnerContext";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { MobileRastreio } from "../../../components/mobile/MobileRastreio";

const Rastreio = () => {
    const isMobile = !useBreakpoint('md');
    const { setIsLoading } = useLoadingSpinner();
    const [isResultRastreio, setIsResultRastreio] = useState(true);
    const [rastreio, setRastreio] = useState<IRastreioResponse | undefined>();

    if (isMobile) {
        return <MobileRastreio />;
    }

    return (
        <Content titulo="Rastreio de encomendas" subTitulo="Fique atento ao status da sua encomenda">
            <FormularioRastreio setIsLoading={setIsLoading} setIsResultRastreio={setIsResultRastreio} setRastreio={setRastreio} />
            {isResultRastreio && rastreio && (
                <ListaHistoricoRastreio historicoRastreios={rastreio ?? undefined} />
            )}
        </Content>
    );
};

export default Rastreio;