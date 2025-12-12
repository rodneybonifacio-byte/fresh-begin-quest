import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { ListaEmissoes } from "./ListaEmissoes";
import { MobileEmissaoList } from "../../../components/mobile/MobileEmissaoList";

const Emissao = () => {
  const isMobile = !useBreakpoint('md');
  
  if (isMobile) {
    return <MobileEmissaoList />;
  }
  
  return <ListaEmissoes />;
};

export default Emissao;
