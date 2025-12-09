import { User } from 'lucide-react';
import { useMemo } from 'react';

interface ProfileAvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Gera avatar baseado no nome (detecta gênero por nomes comuns em português)
export const ProfileAvatar = ({ name, size = 'md', className = '' }: ProfileAvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const avatarData = useMemo(() => {
    if (!name) {
      return { initials: '?', isFemale: false, gradient: 'from-muted to-muted-foreground/50' };
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
      'eronia', // nome do usuário do sistema
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
    if (isFemale) {
      // Gradiente rosa/roxo para feminino
      gradient = 'from-pink-500 to-purple-500';
    } else if (isMale) {
      // Gradiente azul para masculino
      gradient = 'from-blue-500 to-indigo-600';
    } else {
      // Gradiente neutro (laranja/amarelo) para indefinido
      gradient = 'from-primary to-orange-500';
    }

    return { initials, isFemale, gradient };
  }, [name]);

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
      {avatarData.initials || <User className="w-1/2 h-1/2" />}
    </div>
  );
};
