import { ConectaNavbar } from './components/ConectaNavbar';
import { ConectaFooter } from './components/ConectaFooter';
import { ConectaBanner } from './components/ConectaBanner';
import { ConectaOportunidade } from '../site/ConectaOportunidade';

export const BeneficiosConecta = () => {
  return (
    <div className="min-h-screen bg-white">
      <ConectaNavbar />
      <div className="pt-16">
        <ConectaOportunidade hideNavbar />
        <ConectaBanner variant="beneficios" className="py-10 bg-gray-50" />
      </div>
      <ConectaFooter />
    </div>
  );
};

export default BeneficiosConecta;
