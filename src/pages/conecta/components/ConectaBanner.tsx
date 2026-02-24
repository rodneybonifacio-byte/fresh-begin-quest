import { useNavigate } from 'react-router-dom';
import { ArrowRight, Rocket, TrendingDown, Share2, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import bannerParceiro from '@/assets/banner-parceiro.jpg';
import bannerEconomia from '@/assets/banner-economia.jpg';
import bannerLojista from '@/assets/banner-lojista.jpg';
import bannerIndicacao from '@/assets/banner-indicacao.jpg';
import bannerCrescimento from '@/assets/banner-crescimento.jpg';

type BannerVariant = 'oportunidade' | 'conecta' | 'beneficios' | 'programa' | 'home';

const bannerConfig: Record<BannerVariant, {
  badge: string;
  headline: string;
  highlightWord: string;
  sub: string;
  cta: string;
  link: string;
  image: string;
  icon: typeof Rocket;
  accentColor: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}> = {
  oportunidade: {
    badge: '🔥 Programa de Parceiros',
    headline: 'Ganhe dinheiro indicando',
    highlightWord: 'lojistas',
    sub: '20% de comissão vitalícia em cada frete emitido pelos seus indicados. Sem investimento, sem limite.',
    cta: 'Quero ser parceiro',
    link: '/conecta/cadastro',
    image: bannerParceiro,
    icon: Rocket,
    accentColor: '#F37021',
    gradientFrom: '#1a0a00',
    gradientVia: '#7c2d12',
    gradientTo: '#F37021',
  },
  conecta: {
    badge: '⚡ Ferramenta exclusiva',
    headline: 'Prove a economia com',
    highlightWord: 'dados reais',
    sub: 'Use nosso simulador de frete ao vivo e mostre ao seu indicado quanto ele economiza com a BRHUB.',
    cta: 'Simular agora',
    link: '/conecta/beneficios',
    image: bannerEconomia,
    icon: TrendingDown,
    accentColor: '#3b82f6',
    gradientFrom: '#0a0a1a',
    gradientVia: '#1e3a5f',
    gradientTo: '#3b82f6',
  },
  beneficios: {
    badge: '🎯 Dica de parceiro',
    headline: 'Compartilhe e ganhe',
    highlightWord: 'comissão',
    sub: 'Envie esta página para potenciais clientes. Cada cadastro via seu link gera comissão vitalícia para você.',
    cta: 'Criar minha conta',
    link: '/conecta/cadastro',
    image: bannerLojista,
    icon: Share2,
    accentColor: '#10b981',
    gradientFrom: '#021a0f',
    gradientVia: '#064e3b',
    gradientTo: '#10b981',
  },
  programa: {
    badge: '🚀 Próximo passo',
    headline: 'Viu o potencial?',
    highlightWord: 'Comece agora',
    sub: 'Cadastro gratuito em 2 minutos. Receba seu link exclusivo e comece a indicar ainda hoje.',
    cta: 'Cadastrar grátis',
    link: '/conecta/cadastro',
    image: bannerIndicacao,
    icon: Zap,
    accentColor: '#f59e0b',
    gradientFrom: '#1a0f00',
    gradientVia: '#78350f',
    gradientTo: '#f59e0b',
  },
  home: {
    badge: '✨ Novidade BRHUB',
    headline: 'Conheça o',
    highlightWord: 'Conecta+',
    sub: 'Nosso programa de parceiros que paga 20% de comissão vitalícia. Indique, acompanhe e ganhe.',
    cta: 'Saiba mais',
    link: '/conecta',
    image: bannerCrescimento,
    icon: Sparkles,
    accentColor: '#8b5cf6',
    gradientFrom: '#0a0520',
    gradientVia: '#3b0764',
    gradientTo: '#8b5cf6',
  },
};

interface ConectaBannerProps {
  variant: BannerVariant;
  className?: string;
}

export const ConectaBanner = ({ variant, className = '' }: ConectaBannerProps) => {
  const navigate = useNavigate();
  const config = bannerConfig[variant];
  const Icon = config.icon;

  return (
    <section className={`px-4 sm:px-6 ${className}`}>
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl cursor-pointer group"
          onClick={() => navigate(config.link)}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(config.link)}
        >
          {/* Multi-layer gradient background */}
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientVia} 50%, ${config.gradientFrom} 100%)`,
              }}
            />
            {/* Accent glow */}
            <div
              className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-30 group-hover:opacity-50 transition-opacity duration-700"
              style={{ backgroundColor: config.accentColor }}
            />
            <div
              className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[60px] opacity-15"
              style={{ backgroundColor: config.accentColor }}
            />
          </div>

          {/* Photo - larger and more prominent */}
          <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[45%] z-[1]">
            <img
              src={config.image}
              alt=""
              className="w-full h-full object-cover opacity-30 sm:opacity-40 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700 ease-out"
            />
            {/* Photo gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${config.gradientFrom} 5%, ${config.gradientFrom}99 30%, transparent 100%)`,
              }}
            />
            {/* Bottom fade */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 40%, ${config.gradientFrom}cc 100%)`,
              }}
            />
          </div>

          {/* Decorative grid pattern */}
          <div className="absolute inset-0 z-[2] opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-10 py-7 sm:py-9">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border"
                    style={{
                      backgroundColor: `${config.accentColor}15`,
                      borderColor: `${config.accentColor}30`,
                      color: config.accentColor,
                    }}
                  >
                    {config.badge}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight mb-2">
                  {config.headline}{' '}
                  <span style={{ color: config.accentColor }}>{config.highlightWord}</span>
                </h3>

                {/* Subtext */}
                <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-lg mb-4 sm:mb-0">
                  {config.sub}
                </p>
              </div>

              {/* CTA button */}
              <div className="flex-shrink-0 hidden sm:flex flex-col items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(config.link);
                  }}
                  className="flex items-center gap-2 text-sm font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:scale-105"
                  style={{
                    backgroundColor: config.accentColor,
                    color: 'white',
                    boxShadow: `0 8px 32px ${config.accentColor}40`,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {config.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Mobile CTA */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(config.link);
              }}
              className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 text-sm font-bold px-5 py-3 rounded-xl transition-all duration-300"
              style={{
                backgroundColor: config.accentColor,
                color: 'white',
                boxShadow: `0 6px 24px ${config.accentColor}40`,
              }}
            >
              <Icon className="w-4 h-4" />
              {config.cta}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] z-10 opacity-60"
            style={{
              background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)`,
            }}
          />
        </motion.div>
      </div>
    </section>
  );
};
