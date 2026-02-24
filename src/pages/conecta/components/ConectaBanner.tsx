import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import bannerParceiro from '@/assets/banner-parceiro.jpg';
import bannerEconomia from '@/assets/banner-economia.jpg';
import bannerLojista from '@/assets/banner-lojista.jpg';
import bannerIndicacao from '@/assets/banner-indicacao.jpg';
import bannerCrescimento from '@/assets/banner-crescimento.jpg';

type BannerVariant = 'oportunidade' | 'conecta' | 'beneficios' | 'programa' | 'home';

const bannerConfig: Record<BannerVariant, {
  headline: string;
  sub: string;
  cta: string;
  link: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  oportunidade: {
    headline: 'Quer ganhar dinheiro indicando lojistas?',
    sub: 'Conheça o Conecta+ e receba 20% de comissão vitalícia em cada frete.',
    cta: 'Quero ser parceiro →',
    link: '/conecta/cadastro',
    image: bannerParceiro,
    gradientFrom: '#C74800',
    gradientTo: '#F37021',
  },
  conecta: {
    headline: 'Mostre ao seu indicado quanto ele economiza',
    sub: 'Simulador de frete ao vivo: compare BRHUB com outras plataformas.',
    cta: 'Simular frete →',
    link: '/conecta/beneficios',
    image: bannerEconomia,
    gradientFrom: '#1a1a2e',
    gradientTo: '#16213e',
  },
  beneficios: {
    headline: 'Parceiro Conecta+: compartilhe e ganhe',
    sub: 'Envie esta página para seus indicados e ganhe comissão vitalícia.',
    cta: 'Cadastre-se grátis →',
    link: '/conecta/cadastro',
    image: bannerLojista,
    gradientFrom: '#0f4c3a',
    gradientTo: '#16a34a',
  },
  programa: {
    headline: 'Viu o potencial? Comece agora!',
    sub: 'Cadastre-se gratuitamente e comece a indicar clientes hoje mesmo.',
    cta: 'Quero começar →',
    link: '/conecta/cadastro',
    image: bannerIndicacao,
    gradientFrom: '#7c2d12',
    gradientTo: '#ea580c',
  },
  home: {
    headline: 'Conheça o Conecta+',
    sub: 'Indique lojistas e ganhe 20% de comissão vitalícia em cada frete emitido.',
    cta: 'Saiba mais →',
    link: '/conecta',
    image: bannerCrescimento,
    gradientFrom: '#1e1b4b',
    gradientTo: '#4338ca',
  },
};

interface ConectaBannerProps {
  variant: BannerVariant;
  className?: string;
}

export const ConectaBanner = ({ variant, className = '' }: ConectaBannerProps) => {
  const navigate = useNavigate();
  const config = bannerConfig[variant];

  return (
    <section className={`px-4 sm:px-6 ${className}`}>
      <div className="container mx-auto max-w-5xl">
        <div
          className="relative overflow-hidden rounded-2xl shadow-xl cursor-pointer group"
          onClick={() => navigate(config.link)}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(config.link)}
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`,
            }}
          />

          {/* Photo overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 z-[1]">
            <img
              src={config.image}
              alt=""
              className="w-full h-full object-cover opacity-40 sm:opacity-50 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105 transform transition-transform"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${config.gradientFrom} 0%, transparent 100%)`,
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between gap-4 px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">
                Conecta+
              </p>
              <h3 className="text-base sm:text-xl font-black text-white leading-tight mb-1">
                {config.headline}
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-snug max-w-md">
                {config.sub}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(config.link);
              }}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-white/20 transition-all duration-200 group-hover:bg-white/25"
            >
              {config.cta}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
