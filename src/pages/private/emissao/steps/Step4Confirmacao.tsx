import { CheckCircle, User, MapPin, Package, Truck, Clock, DollarSign, BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { useEmissao } from '../../../../hooks/useEmissao';
import type { IEmissao } from '../../../../types/IEmissao';
import type { IEmbalagem } from '../../../../types/IEmbalagem';
import { formatNumberString } from '../../../../utils/formatCurrency';
import { toast } from 'sonner';
import { getTransportadoraImage, getTransportadoraAltText } from '../../../../utils/imageHelper';

interface Step4ConfirmacaoProps {
  onBack: () => void;
  onSuccess: () => void;
  cotacaoSelecionado: any;
  selectedEmbalagem: any;
  clienteSelecionado: any;
}

export const Step4Confirmacao = ({ onBack, onSuccess, cotacaoSelecionado, selectedEmbalagem, clienteSelecionado }: Step4ConfirmacaoProps) => {
  const { handleSubmit, getValues } = useFormContext();
  const { onEmissaoCadastro } = useEmissao();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formData = getValues();
  const destinatarioData = formData.destinatario;
  const embalagemData = formData.embalagem;

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const embalagem: IEmbalagem = {
        ...selectedEmbalagem,
        altura: Number(data.embalagem.altura),
        largura: Number(data.embalagem.largura),
        comprimento: Number(data.embalagem.comprimento),
        peso: Number(data.embalagem.peso),
        diametro: 0,
      };

      const emissao: IEmissao = {
        remetenteId: data.remetenteId,
        cienteObjetoNaoProibido: true,
        embalagem: embalagem,
        cotacao: cotacaoSelecionado,
        logisticaReversa: 'N',
        valorDeclarado: Number(formatNumberString('0')),
        valorNotaFiscal: Number(formatNumberString('0')),
        itensDeclaracaoConteudo: [],
        destinatario: data.destinatario,
      };
      
      await onEmissaoCadastro(emissao, setIsSubmitting);
      toast.success('Etiqueta gerada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
      toast.error('Erro ao gerar etiqueta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard 
      icon={BadgeCheck} 
      title="Confirmação de Envio" 
      description="Revise todas as informações antes de gerar a etiqueta"
    >
      <div className="space-y-6">
        {/* Resumo Visual do Frete Selecionado */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border-2 border-primary/30 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Frete Selecionado</h3>
                <p className="text-sm text-muted-foreground">Opção mais vantajosa</p>
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <img
                src={getTransportadoraImage(cotacaoSelecionado?.imagem || '')}
                alt={getTransportadoraAltText(cotacaoSelecionado?.imagem || '')}
                className="w-24 h-8 object-contain"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modalidade</p>
                <p className="font-semibold text-sm text-foreground">{cotacaoSelecionado?.nomeServico}</p>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="font-semibold text-sm text-foreground">
                  {cotacaoSelecionado?.prazo} {cotacaoSelecionado?.prazo > 1 ? 'dias úteis' : 'dia útil'}
                </p>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="font-bold text-base text-primary">{cotacaoSelecionado?.preco}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dados do Remetente */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-base text-foreground">Remetente</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Nome</p>
              <p className="font-semibold text-sm text-foreground">{clienteSelecionado?.nome}</p>
            </div>
            {clienteSelecionado?.endereco && (
              <>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">CEP</p>
                  <p className="font-semibold text-sm text-foreground">{clienteSelecionado.endereco.cep}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Endereço</p>
                  <p className="font-semibold text-sm text-foreground">
                    {clienteSelecionado.endereco.logradouro}, {clienteSelecionado.endereco.numero} - {clienteSelecionado.endereco.bairro}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clienteSelecionado.endereco.localidade}/{clienteSelecionado.endereco.uf}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dados do Destinatário */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-base text-foreground">Destinatário</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Nome</p>
              <p className="font-semibold text-sm text-foreground">{destinatarioData?.nome}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">CPF/CNPJ</p>
              <p className="font-semibold text-sm text-foreground">{destinatarioData?.cpfCnpj}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Telefone</p>
              <p className="font-semibold text-sm text-foreground">{destinatarioData?.celular}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">CEP</p>
              <p className="font-semibold text-sm text-foreground">{destinatarioData?.endereco?.cep}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Endereço</p>
              <p className="font-semibold text-sm text-foreground">
                {destinatarioData?.endereco?.logradouro}, {destinatarioData?.endereco?.numero} - {destinatarioData?.endereco?.bairro}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {destinatarioData?.endereco?.localidade}/{destinatarioData?.endereco?.uf}
              </p>
            </div>
          </div>
        </div>

        {/* Dados da Embalagem */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-base text-foreground">Dimensões da Embalagem</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Altura</p>
              <p className="font-bold text-lg text-foreground">{embalagemData?.altura}<span className="text-xs ml-1">cm</span></p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Largura</p>
              <p className="font-bold text-lg text-foreground">{embalagemData?.largura}<span className="text-xs ml-1">cm</span></p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Comprimento</p>
              <p className="font-bold text-lg text-foreground">{embalagemData?.comprimento}<span className="text-xs ml-1">cm</span></p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Peso</p>
              <p className="font-bold text-lg text-foreground">{embalagemData?.peso}<span className="text-xs ml-1">g</span></p>
            </div>
          </div>
        </div>

        {/* Alerta de Confirmação */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Confira todos os dados antes de gerar a etiqueta
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Após a geração, não será possível alterar as informações
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <ButtonComponent 
            type="button" 
            variant="primary" 
            border="outline" 
            onClick={onBack} 
            disabled={isSubmitting}
            className="flex-1 h-12"
          >
            ← Voltar
          </ButtonComponent>
          <ButtonComponent 
            type="button" 
            onClick={handleSubmit(onSubmit)} 
            disabled={isSubmitting}
            className="flex-1 h-12 font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Gerando Etiqueta...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Gerar Etiqueta
              </span>
            )}
          </ButtonComponent>
        </div>
      </div>
    </FormCard>
  );
};
