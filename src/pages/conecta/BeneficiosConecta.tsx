import { ConectaNavbar } from './components/ConectaNavbar';
import { ConectaFooter } from './components/ConectaFooter';
import { ConectaOportunidade } from '../site/ConectaOportunidade';

export const BeneficiosConecta = () => {
  return (
    <div className="min-h-screen bg-white">
      <ConectaNavbar />
      <div className="pt-16">
        <ConectaOportunidade hideNavbar />
      </div>
      <ConectaFooter />
    </div>
  );
};

export default BeneficiosConecta;
