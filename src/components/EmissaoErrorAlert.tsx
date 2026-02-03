import { AlertTriangle, Copy, X, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface EmissaoErrorDetails {
  error: string;
  code?: string;
  status?: number;
  details?: any;
  fieldErrors?: Record<string, string>;
}

interface EmissaoErrorAlertProps {
  error: EmissaoErrorDetails;
  onDismiss?: () => void;
  onFieldClick?: (fieldPath: string) => void;
}

// Detectar se é um erro de dimensões/limites físicos
const isDimensionError = (error: string, details?: any): { isDimension: boolean; friendlyMessage?: string; dimension?: string; value?: number; limit?: number } => {
  const errorLower = error.toLowerCase();
  const detailsStr = typeof details === 'string' ? details.toLowerCase() : JSON.stringify(details || '').toLowerCase();
  const combined = `${errorLower} ${detailsStr}`;
  
  // Padrões de erro de dimensão dos Correios
  const dimensionPatterns = [
    { pattern: /comprimento.*(\d+).*deve ser entre.*(\d+).*e.*(\d+)/i, dimension: 'comprimento', extract: true },
    { pattern: /largura.*(\d+).*deve ser entre.*(\d+).*e.*(\d+)/i, dimension: 'largura', extract: true },
    { pattern: /altura.*(\d+).*deve ser entre.*(\d+).*e.*(\d+)/i, dimension: 'altura', extract: true },
    { pattern: /peso.*(\d+).*deve ser entre.*(\d+).*e.*(\d+)/i, dimension: 'peso', extract: true },
    { pattern: /ppn-054/i, dimension: 'dimensão', extract: false },
    { pattern: /dimensões? (inválid|excede|fora)/i, dimension: 'dimensão', extract: false },
    { pattern: /tamanho (máximo|excede|inválid)/i, dimension: 'dimensão', extract: false },
    { pattern: /limite.*(comprimento|largura|altura|peso)/i, dimension: 'dimensão', extract: false },
  ];
  
  for (const { pattern, dimension, extract } of dimensionPatterns) {
    const match = combined.match(pattern);
    if (match) {
      let friendlyMessage = '';
      let value: number | undefined;
      let limit: number | undefined;
      
      if (extract && match.length >= 4) {
        value = parseInt(match[1]);
        limit = parseInt(match[3]);
        const unit = dimension === 'peso' ? 'g' : 'cm';
        friendlyMessage = `O ${dimension} informado (${value}${unit}) excede o limite máximo permitido (${limit}${unit}) para este serviço.`;
      } else {
        friendlyMessage = `As dimensões do pacote excedem os limites permitidos pela transportadora selecionada.`;
      }
      
      return { isDimension: true, friendlyMessage, dimension, value, limit };
    }
  }
  
  return { isDimension: false };
};

// Detectar se é um erro de validação de campos (ex.: valor nota fiscal)
const isValidationError = (error: string, details?: any): { isValidation: boolean; fieldName?: string; friendlyMessage?: string } => {
  const errorLower = error.toLowerCase();
  
  // Padrões de validação conhecidos (Rodonaves, etc.)
  const validationPatterns: { pattern: RegExp; field: string; friendly: string }[] = [
    { pattern: /valornotafiscal.*informe|informe.*valor.*nota\s?fiscal/i, field: 'valorNotaFiscal', friendly: 'É necessário informar o valor da nota fiscal para emitir etiqueta com esta transportadora.' },
    { pattern: /nota\s?fiscal.*obrigat[oó]ri/i, field: 'valorNotaFiscal', friendly: 'A nota fiscal é obrigatória para esta transportadora.' },
    { pattern: /cpf.*inv[aá]lid/i, field: 'cpfCnpj', friendly: 'O CPF/CNPJ informado é inválido.' },
    { pattern: /cnpj.*inv[aá]lid/i, field: 'cpfCnpj', friendly: 'O CPF/CNPJ informado é inválido.' },
    { pattern: /cep.*inv[aá]lid|cep.*n[aã]o encontrado/i, field: 'cep', friendly: 'O CEP informado é inválido ou não foi encontrado.' },
    { pattern: /celular.*inv[aá]lid|telefone.*inv[aá]lid/i, field: 'celular', friendly: 'O número de celular informado é inválido.' },
  ];
  
  for (const { pattern, field, friendly } of validationPatterns) {
    if (pattern.test(error) || pattern.test(errorLower)) {
      return { isValidation: true, fieldName: field, friendlyMessage: friendly };
    }
  }
  
  // Tentar extrair de details.body.error.message se existir
  const bodyMsg = details?.body?.error?.message || details?.body?.message || '';
  if (bodyMsg) {
    for (const { pattern, field, friendly } of validationPatterns) {
      if (pattern.test(bodyMsg)) {
        return { isValidation: true, fieldName: field, friendlyMessage: friendly };
      }
    }
  }
  
  return { isValidation: false };
};

// Mapear mensagens de erro para campos do formulário
const mapErrorToField = (errorMessage: string, details?: any): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  const msg = errorMessage.toLowerCase();
  
  // Mapeamentos conhecidos
  if (msg.includes('cep') || msg.includes('zip')) {
    fieldErrors['destinatario.endereco.cep'] = errorMessage;
  }
  if (msg.includes('cpf') || msg.includes('cnpj')) {
    fieldErrors['destinatario.cpfCnpj'] = errorMessage;
  }
  if (msg.includes('celular') || msg.includes('telefone') || msg.includes('phone')) {
    fieldErrors['destinatario.celular'] = errorMessage;
  }
  if (msg.includes('nome') && msg.includes('destinat')) {
    fieldErrors['destinatario.nome'] = errorMessage;
  }
  if (msg.includes('logradouro') || msg.includes('endereço') || msg.includes('rua')) {
    fieldErrors['destinatario.endereco.logradouro'] = errorMessage;
  }
  if (msg.includes('número') || msg.includes('numero')) {
    fieldErrors['destinatario.endereco.numero'] = errorMessage;
  }
  if (msg.includes('bairro')) {
    fieldErrors['destinatario.endereco.bairro'] = errorMessage;
  }
  if (msg.includes('cidade') || msg.includes('localidade')) {
    fieldErrors['destinatario.endereco.localidade'] = errorMessage;
  }
  if (msg.includes('uf') || msg.includes('estado')) {
    fieldErrors['destinatario.endereco.uf'] = errorMessage;
  }
  if (msg.includes('peso') || msg.includes('weight')) {
    fieldErrors['embalagem.peso'] = errorMessage;
  }
  if (msg.includes('altura') || msg.includes('height')) {
    fieldErrors['embalagem.altura'] = errorMessage;
  }
  if (msg.includes('largura') || msg.includes('width')) {
    fieldErrors['embalagem.largura'] = errorMessage;
  }
  if (msg.includes('comprimento') || msg.includes('length')) {
    fieldErrors['embalagem.comprimento'] = errorMessage;
  }
  if (msg.includes('remetente') || msg.includes('sender')) {
    fieldErrors['remetenteId'] = errorMessage;
  }
  
  // Se details contiver array de erros, tentar mapear
  if (Array.isArray(details?.error)) {
    details.error.forEach((e: any) => {
      if (e?.path && e?.message) {
        fieldErrors[e.path] = e.message;
      }
    });
  }
  
  return fieldErrors;
};

export const EmissaoErrorAlert = ({ error, onDismiss, onFieldClick }: EmissaoErrorAlertProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const dimensionCheck = isDimensionError(error.error, error.details);
  const validationCheck = isValidationError(error.error, error.details);
  const fieldErrors = error.fieldErrors || mapErrorToField(error.error, error.details);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  
  // Determinar tipo de erro para estilização
  const isSpecialError = dimensionCheck.isDimension || validationCheck.isValidation;
  const displayMessage = dimensionCheck.isDimension 
    ? dimensionCheck.friendlyMessage 
    : validationCheck.isValidation 
      ? validationCheck.friendlyMessage 
      : error.error;
  const errorTitle = dimensionCheck.isDimension 
    ? 'Dimensões do pacote inválidas' 
    : validationCheck.isValidation 
      ? 'Dados incompletos' 
      : 'Erro ao emitir etiqueta';
  
  const copyErrorDetails = () => {
    const errorInfo = {
      error: error.error,
      code: error.code,
      status: error.status,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    toast.success('Detalhes copiados para a área de transferência');
  };
  
  const formatFieldName = (path: string): string => {
    const fieldNames: Record<string, string> = {
      'destinatario.nome': 'Nome do Destinatário',
      'destinatario.cpfCnpj': 'CPF/CNPJ',
      'destinatario.celular': 'Celular',
      'destinatario.endereco.cep': 'CEP',
      'destinatario.endereco.logradouro': 'Logradouro',
      'destinatario.endereco.numero': 'Número',
      'destinatario.endereco.bairro': 'Bairro',
      'destinatario.endereco.localidade': 'Cidade',
      'destinatario.endereco.uf': 'Estado',
      'embalagem.peso': 'Peso',
      'embalagem.altura': 'Altura',
      'embalagem.largura': 'Largura',
      'embalagem.comprimento': 'Comprimento',
      'remetenteId': 'Remetente',
    };
    return fieldNames[path] || path;
  };
  
  return (
    <div className={`${isSpecialError ? 'bg-amber-500/10 border-amber-500/50' : 'bg-destructive/10 border-destructive/50'} border-2 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 ${isSpecialError ? 'bg-amber-500/20' : 'bg-destructive/20'} rounded-lg shrink-0`}>
            {isSpecialError ? (
              <Package className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base ${isSpecialError ? 'text-amber-700 dark:text-amber-500' : 'text-destructive'}`}>
              {errorTitle}
            </h3>
            <p className="text-sm text-foreground/80 mt-1 break-words">
              {displayMessage}
            </p>
            
            {/* Dica para erro de dimensão */}
            {dimensionCheck.isDimension && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                  💡 Dica
                </p>
                <p className="text-xs text-foreground/70">
                  Verifique as dimensões do pacote e ajuste para dentro dos limites da transportadora. 
                  Os Correios (PAC/SEDEX) aceitam no máximo <strong>100cm</strong> de comprimento e <strong>30kg</strong> de peso.
                </p>
              </div>
            )}
            
            {/* Dica para erro de validação (ex.: nota fiscal) */}
            {validationCheck.isValidation && (
              <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                  💡 Dica
                </p>
                <p className="text-xs text-foreground/70">
                  {validationCheck.fieldName === 'valorNotaFiscal' 
                    ? 'A transportadora Rodonaves exige o valor da nota fiscal para emitir a etiqueta. Preencha o campo "Valor da Nota Fiscal" no passo anterior.' 
                    : 'Verifique os dados informados e tente novamente.'}
                </p>
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1.5 ${isSpecialError ? 'hover:bg-amber-500/20' : 'hover:bg-destructive/20'} rounded-lg transition-colors shrink-0`}
          >
            <X className={`h-4 w-4 ${isSpecialError ? 'text-amber-600' : 'text-destructive'}`} />
          </button>
        )}
      </div>
      
      {/* Code Badge */}
      {error.code && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-mono bg-destructive/20 text-destructive px-2 py-1 rounded-md">
            Código: {error.code}
          </span>
          {error.status && (
            <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">
              Status: {error.status}
            </span>
          )}
        </div>
      )}
      
      {/* Field Errors */}
      {hasFieldErrors && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-destructive/80 uppercase tracking-wide">
            Campos com problema:
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(fieldErrors).map(([fieldPath]) => (
              <button
                key={fieldPath}
                onClick={() => onFieldClick?.(fieldPath)}
                className="text-xs bg-destructive/20 hover:bg-destructive/30 text-destructive px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-destructive/30"
              >
                <span className="font-medium">{formatFieldName(fieldPath)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Expandable Details */}
      {error.details && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
          </button>
          
          {showDetails && (
            <div className="mt-3 bg-background/80 rounded-lg p-3 border border-border">
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                {typeof error.details === 'string' 
                  ? error.details 
                  : JSON.stringify(error.details, null, 2)
                }
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={copyErrorDetails}
          className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-lg transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar detalhes
        </button>
      </div>
    </div>
  );
};
