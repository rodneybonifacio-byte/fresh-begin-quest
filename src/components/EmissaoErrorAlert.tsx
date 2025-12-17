import { AlertTriangle, Copy, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  const fieldErrors = error.fieldErrors || mapErrorToField(error.error, error.details);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  
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
    <div className="bg-destructive/10 border-2 border-destructive/50 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-destructive/20 rounded-lg shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-destructive text-base">
              Erro ao emitir etiqueta
            </h3>
            <p className="text-sm text-foreground/80 mt-1 break-words">
              {error.error}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-destructive" />
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
