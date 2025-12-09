import { useMemo } from 'react';

interface ProfileAvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showIcon?: boolean; // Mostra ícone de silhueta em vez de iniciais
}

// Gera avatar baseado no nome (detecta gênero por nomes comuns em português)
export const ProfileAvatar = ({ name, size = 'md', className = '', showIcon = false }: ProfileAvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64,
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const avatarData = useMemo(() => {
    if (!name) {
      return { initials: '?', gender: 'neutral' as const, gradient: 'from-muted to-muted-foreground/50' };
    }

    const firstName = name.split(' ')[0].toLowerCase();
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Lista de nomes femininos comuns em português
    const femaleNames = [
      'maria', 'ana', 'julia', 'juliana', 'fernanda', 'patricia', 'paula', 'camila',
      'amanda', 'bruna', 'carolina', 'daniela', 'gabriela', 'larissa', 'leticia',
      'luciana', 'mariana', 'natalia', 'renata', 'sandra', 'silvia', 'tatiana',
      'vanessa', 'adriana', 'aline', 'andrea', 'beatriz', 'bianca', 'carla',
      'claudia', 'cristina', 'debora', 'elaine', 'fabiana', 'flavia', 'helena',
      'isabela', 'jessica', 'joana', 'luana', 'lucia', 'marta', 'michele',
      'monica', 'priscila', 'raquel', 'roberta', 'simone', 'sonia', 'vera',
      'victoria', 'viviane', 'yasmin', 'alice', 'sophia', 'laura', 'manuela',
      'valentina', 'giovanna', 'isadora', 'heloisa', 'lorena', 'lais', 'rafaela',
      'sarah', 'nicole', 'marina', 'livia', 'eduarda', 'clara', 'cecilia',
      'luiza', 'antonia', 'emanuella', 'vitoria', 'melissa', 'eloisa', 'catarina',
      'eronia', 'rosa', 'tereza', 'francisca', 'aparecida', 'fatima', 'conceicao',
    ];

    // Lista de nomes masculinos comuns em português
    const maleNames = [
      'joao', 'jose', 'carlos', 'paulo', 'pedro', 'lucas', 'gabriel', 'rafael',
      'daniel', 'marcelo', 'bruno', 'rodrigo', 'andre', 'alexandre', 'antonio',
      'fernando', 'ricardo', 'marcos', 'guilherme', 'henrique', 'diego', 'thiago',
      'eduardo', 'felipe', 'leonardo', 'gustavo', 'matheus', 'vinicius', 'caio',
      'arthur', 'bernardo', 'enzo', 'miguel', 'nicolas', 'davi', 'samuel',
      'heitor', 'lorenzo', 'theo', 'benjamin', 'murilo', 'francisco', 'joaquim',
      'roberto', 'sergio', 'jorge', 'claudio', 'renato', 'fabio', 'marcio',
      'rogerio', 'leandro', 'adriano', 'alex', 'anderson', 'wagner', 'alan',
      'william', 'jefferson', 'wellington', 'edson', 'luiz', 'raimundo', 'manoel',
    ];

    const isFemale = femaleNames.some((fn) => firstName.startsWith(fn) || fn.startsWith(firstName));
    const isMale = maleNames.some((mn) => firstName.startsWith(mn) || mn.startsWith(firstName));

    let gradient: string;
    let gender: 'female' | 'male' | 'neutral';
    
    if (isFemale) {
      gradient = 'from-pink-500 to-purple-500';
      gender = 'female';
    } else if (isMale) {
      gradient = 'from-blue-500 to-indigo-600';
      gender = 'male';
    } else {
      gradient = 'from-primary to-orange-500';
      gender = 'neutral';
    }

    return { initials, gender, gradient };
  }, [name]);

  // SVG de silhueta feminina
  const FemaleIcon = ({ size: s }: { size: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4" fill="white" />
      <path 
        d="M12 14C7.58172 14 4 16.2386 4 19V21C4 21.5523 4.44772 22 5 22H19C19.5523 22 20 21.5523 20 21V19C20 16.2386 16.4183 14 12 14Z" 
        fill="white" 
      />
      <ellipse cx="12" cy="6" rx="2.5" ry="1" fill="white" opacity="0.6" />
    </svg>
  );

  // SVG de silhueta masculina
  const MaleIcon = ({ size: s }: { size: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4" fill="white" />
      <path 
        d="M12 14C7.58172 14 4 16.2386 4 19V21C4 21.5523 4.44772 22 5 22H19C19.5523 22 20 21.5523 20 21V19C20 16.2386 16.4183 14 12 14Z" 
        fill="white" 
      />
    </svg>
  );

  // SVG neutro
  const NeutralIcon = ({ size: s }: { size: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="white" />
      <path 
        d="M12 14C7.58172 14 4 16.2386 4 19V21C4 21.5523 4.44772 22 5 22H19C19.5523 22 20 21.5523 20 21V19C20 16.2386 16.4183 14 12 14Z" 
        fill="white" 
      />
    </svg>
  );

  const renderContent = () => {
    if (showIcon) {
      const iconSize = iconSizes[size];
      switch (avatarData.gender) {
        case 'female':
          return <FemaleIcon size={iconSize} />;
        case 'male':
          return <MaleIcon size={iconSize} />;
        default:
          return <NeutralIcon size={iconSize} />;
      }
    }
    return <span className={textSizes[size]}>{avatarData.initials}</span>;
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        bg-gradient-to-br ${avatarData.gradient}
        flex items-center justify-center 
        font-bold text-white
        shadow-lg
        ${className}
      `}
    >
      {renderContent()}
    </div>
  );
};
