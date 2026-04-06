import { CheckCircle, User, MapPin, Package, Truck, Clock, DollarSign, BadgeCheck, FileText } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormCard } from '../../../../components/FormCard';
import { ButtonComponent } from '../../../../components/button';
import { useEmissao } from '../../../../hooks/useEmissao';
import { useImprimirEtiquetaPDF } from '../../../../hooks/useImprimirEtiquetaPDF';
import type { IEmissao } from '../../../../types/IEmissao';
import type { IEmbalagem } from '../../../../types/IEmbalagem';

import { toast } from 'sonner';
import { getTransportadoraImage, getTransportadoraAltText } from '../../../../utils/imageHelper';
import { CreditoService } from '../../../../services/CreditoService';
import { useAuth } from '../../../../providers/AuthContext';
import { ModalRecargaPix } from '../../financeiro/recarga/ModalRecargaPix';
import { RecargaPixService } from '../../../../services/RecargaPixService';
import { ICreatePixChargeResponse } from '../../../../types/IRecargaPix';
import { EmissaoErrorAlert } from '../../../../components/EmissaoErrorAlert';

interface EmissaoErrorDetails {
  error: string;
  code?: string;
  status?: number;
  details?: any;
}

interface Step4ConfirmacaoProps {
  onBack: () => void;
  onSuccess: (emissao: any, pdfData: { nome: string; dados: string; linkEtiqueta?: string }) => void;
  cotacaoSelecionado: any;
  selectedEmbalagem: any;
  clienteSelecionado: any;
  isLogisticaReversa?: boolean;
}

export const Step4Confirmacao = ({ onBack, onSuccess, cotacaoSelecionado, selectedEmbalagem, clienteSelecionado, isLogisticaReversa = false }: Step4ConfirmacaoProps) => {
  const { handleSubmit, getValues, setError } = useFormContext();
  const { onEmissaoCadastro } = useEmissao();
  const { onEmissaoImprimir } = useImprimirEtiquetaPDF();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const creditoService = new CreditoService();
  
  // Estados para modal de recarga
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixChargeData, setPixChargeData] = useState<ICreatePixChargeResponse['data']>();
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [emissaoPendente, setEmissaoPendente] = useState<any>(null);
  
  // Estado para erro estruturado de emissão
  const [emissaoError, setEmissaoError] = useState<EmissaoErrorDetails | null>(null);

  const formData = getValues();
  const destinatarioData = formData.destinatario;
  const embalagemData = formData.embalagem;

  // Função para processar emissão (extraída para reutilização)
  const processarEmissao = async (dadosEmissao: any) => {
    if (!user?.clienteId) return;

    try {
      setIsSubmitting(true);
      const valorEtiqueta = Number(cotacaoSelecionado?.preco) || 0;
      
      console.log('🎯 Iniciando processo de emissão...');
      console.log('💰 Valor da etiqueta:', valorEtiqueta);

      // Verificar saldo novamente
      const saldoAtualizado = await creditoService.calcularSaldo(user.clienteId);
      console.log('💳 Saldo atualizado:', saldoAtualizado);

      if (saldoAtualizado < valorEtiqueta) {
        toast.error('Saldo ainda insuficiente. Aguarde a confirmação do pagamento.');
        setIsSubmitting(false);
        return;
      }

      // BLOQUEAR CRÉDITO ANTES DE CRIAR A EMISSÃO
      console.log('🔒 Bloqueando crédito...');
      try {
        const transacaoId = await creditoService.bloquearCreditoEtiqueta(
          user.clienteId,
          'temp-' + Date.now(), // ID temporário, será substituído pelo ID real da emissão
          valorEtiqueta
        );
        console.log('✅ Crédito bloqueado. ID da transação:', transacaoId);
      } catch (errorBloquear: any) {
        console.error('❌ Erro ao bloquear crédito:', errorBloquear);
        toast.error(errorBloquear.message || 'Erro ao bloquear crédito');
        setIsSubmitting(false);
        return;
      }

      // Criar emissão
      console.log('📦 Criando emissão...');
      const response = await onEmissaoCadastro(dadosEmissao, (loading) => {
        console.log('Loading status:', loading);
      });

      if (!response?.data?.id) {
        toast.error('Erro ao criar emissão');
        setIsSubmitting(false);
        return;
      }

      const emissaoId = response.data.id;
      console.log('✅ Emissão criada. ID:', emissaoId);

      // Imprimir etiqueta
      console.log('🖨️ Gerando PDF da etiqueta...');
      const pdfResponse = await onEmissaoImprimir(response.data, 'etiqueta', setIsSubmitting);
      console.log('✅ PDF gerado com sucesso');

      toast.success('Etiqueta gerada com sucesso! Créditos bloqueados.');
      onSuccess(response.data, pdfResponse.data);
    } catch (error: any) {
      console.error('❌ Erro no processo de emissão:', error);
      toast.error(error.message || 'Erro ao gerar etiqueta');
    } finally {
      setIsSubmitting(false);
      setEmissaoPendente(null);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      // VALIDAÇÃO DE SALDO ANTES DE GERAR ETIQUETA
      if (!user?.clienteId) {
        toast.error('Usuário não identificado');
        setIsSubmitting(false);
        return;
      }

      const valorEtiqueta = Number(cotacaoSelecionado?.preco) || 0;
      console.log('💰 Valor da etiqueta:', valorEtiqueta);
      
      // Criar objeto emissão ANTES de verificar saldo
      const embalagem: IEmbalagem = {
        ...selectedEmbalagem,
        altura: Number(data.embalagem.altura),
        largura: Number(data.embalagem.largura),
        comprimento: Number(data.embalagem.comprimento),
        peso: Number(data.embalagem.peso),
        diametro: 0,
        quantidadeVolumes: Number(data.embalagem.quantidadeVolumes) || 1,
      };

      // Enriquecer cotação com embalagem e transportadora se necessário
      const cotacaoEnriquecida = {
        ...cotacaoSelecionado,
        transportadora: cotacaoSelecionado?.transportadora || cotacaoSelecionado?.codigoServico || cotacaoSelecionado?.nomeServico?.toUpperCase(),
        embalagem: {
          peso: embalagem.peso,
          comprimento: embalagem.comprimento,
          altura: embalagem.altura,
          largura: embalagem.largura,
          diametro: embalagem.diametro || 0,
        },
      };

      // Converte valorNotaFiscal de "R$ 1.234,56" para número 1234.56
      const parseValorNotaFiscal = (valor: string | undefined): number => {
        if (!valor) return 0;
        // Remove tudo exceto dígitos e vírgula
        const digitsAndComma = valor.replace(/[^\d,]/g, '');
        // Substitui vírgula por ponto e converte
        const numericValue = parseFloat(digitsAndComma.replace(',', '.'));
        return isNaN(numericValue) ? 0 : numericValue;
      };

      const emissao: IEmissao = {
        remetenteId: data.remetenteId,
        cienteObjetoNaoProibido: true,
        embalagem: embalagem,
        cotacao: cotacaoEnriquecida,
        logisticaReversa: isLogisticaReversa ? 'S' : 'N',
        valorDeclarado: 0,
        valorNotaFiscal: parseValorNotaFiscal(data.valorNotaFiscal),
        itensDeclaracaoConteudo: data.itensDeclaracaoConteudo || [],
        destinatario: data.destinatario,
        quantidadeVolumes: embalagem.quantidadeVolumes || 1,
      };
      
      // Buscar saldo atual
      const saldoCliente = await creditoService.calcularSaldo(user.clienteId);
      console.log('💳 Saldo atual do cliente:', saldoCliente);
      setSaldoAtual(saldoCliente);
      
      // Validar saldo suficiente
      if (saldoCliente < valorEtiqueta) {
        console.log('❌ Saldo insuficiente!');
        setIsSubmitting(false);
        toast.error('Saldo insuficiente. Realize uma recarga para continuar.');
        
        // Guardar dados da emissão para processar após pagamento
        setEmissaoPendente(emissao);
        
        // Valor da recarga = valor exato da etiqueta
        const valorRecarga = valorEtiqueta;
        
        console.log(`💰 Gerando PIX de R$ ${valorRecarga.toFixed(2)} (valor da etiqueta)`);
        
        // Gerar cobrança PIX automaticamente
        try {
          const response = await RecargaPixService.criarCobrancaPix({
            valor: valorRecarga,
            expiracao: 3600
          });
          
          if (response.success && response.data) {
            setPixChargeData(response.data);
            setShowPixModal(true);
            toast.success(`Cobrança PIX de R$ ${valorRecarga.toFixed(2)} gerada. Após o pagamento, a etiqueta será gerada automaticamente.`);
          } else {
            toast.error('Erro ao gerar cobrança PIX. Tente novamente.');
          }
        } catch (error) {
          console.error('Erro ao gerar PIX:', error);
          toast.error('Erro ao gerar cobrança PIX');
        }
        return;
      }
      
      console.log('✅ Saldo suficiente. Prosseguindo com geração da etiqueta...');
      console.log('📤 Enviando emissão:', emissao);
      
      // Primeiro gera a emissão - backend retorna { id, frete, link_etiqueta }
      const backendResponse = await onEmissaoCadastro(emissao, setIsSubmitting);
      
      console.log('✅ Resposta do backend:', backendResponse);
      console.log('🆔 ID da emissão:', backendResponse?.id);
      console.log('🔗 Link etiqueta:', backendResponse?.link_etiqueta);
      console.log('📦 Array frete:', backendResponse?.frete);
      
      // Verifica se temos o ID da emissão
      if (!backendResponse?.id) {
        console.error('❌ Backend não retornou ID:', backendResponse);
        throw new Error('Erro ao criar emissão: ID não retornado');
      }
      
      // Aguarda 1 segundo para o backend processar e gerar o código de rastreio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Busca a emissão completa para obter o código de rastreio atualizado
      console.log('🔍 Buscando dados completos da emissão...');
      const EmissaoServiceClass = (await import('../../../../services/EmissaoService')).EmissaoService;
      const emissaoService = new EmissaoServiceClass();
      const emissaoCompletaResponse = await emissaoService.getById(backendResponse.id);
      
      console.log('📦 Emissão completa recebida:', emissaoCompletaResponse);
      
      const codigoObjeto = emissaoCompletaResponse?.data?.codigoObjeto || 
                          backendResponse?.frete?.[0]?.codigoObjeto || 
                          'Processando...';
      
      console.log('🏷️ Código de rastreio:', codigoObjeto);
      
      // 3. BLOQUEAR CRÉDITO (reserva por 72h)
      console.log('🔒 Bloqueando crédito da etiqueta...');
      try {
        await creditoService.bloquearCreditoEtiqueta(
          user.clienteId,
          backendResponse.id,
          valorEtiqueta,
          codigoObjeto !== 'Processando...' ? codigoObjeto : null
        );
        console.log('✅ Crédito bloqueado com sucesso por 72h');
        toast.success('Crédito reservado por 72h', { duration: 3000 });
      } catch (error) {
        console.error('❌ Erro ao bloquear crédito:', error);
        toast.warning('Etiqueta gerada mas erro ao bloquear crédito');
      }
      
      // Monta o objeto emissão completo com o ID e código de rastreio
      const emissaoCriada: IEmissao = {
        ...emissao,
        id: backendResponse.id,
        codigoObjeto: codigoObjeto,
      };
      
      console.log('📄 Buscando PDF para emissão ID:', emissaoCriada.id);
      
      // Aguarda 500ms para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Tenta buscar o PDF da etiqueta via API
      try {
        const pdfResponse = await onEmissaoImprimir(
          emissaoCriada,
          'etiqueta',
          setIsSubmitting
        );
        
        console.log('✅ PDF recebido:', pdfResponse);
        
        if (pdfResponse?.data?.dados) {
          toast.success('Etiqueta gerada com sucesso!');
          onSuccess(emissaoCriada, pdfResponse.data);
          return;
        }
      } catch (pdfError: any) {
        console.warn('⚠️ Erro ao buscar PDF via API, usando link direto:', pdfError?.message);
      }
      
      // Fallback: usar link_etiqueta direto se a API de PDF falhar
      if (backendResponse?.link_etiqueta) {
        console.log('🔗 Usando link direto da etiqueta:', backendResponse.link_etiqueta);
        toast.success('Etiqueta gerada com sucesso!');
        
        // Passa dados com link direto para o próximo step
        onSuccess(emissaoCriada, { 
          nome: 'etiqueta.pdf', 
          dados: '', 
          linkEtiqueta: backendResponse.link_etiqueta 
        });
        return;
      }
      
      throw new Error('Erro ao gerar PDF: nenhum método de download disponível');
    } catch (error: any) {
      console.error('❌ Erro completo ao gerar etiqueta:', error);
      console.error('Stack:', error?.stack);
      
      // Capturar erro estruturado para exibir com detalhes
      const structuredError: EmissaoErrorDetails = {
        error: error?.message || 'Erro ao gerar etiqueta',
        code: error?.code,
        status: error?.status,
        details: error?.details,
      };
      setEmissaoError(structuredError);
      
      // Também exibe toast para feedback imediato
      toast.error(structuredError.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para clique em campo com erro - volta para a etapa correspondente
  const handleFieldErrorClick = (fieldPath: string) => {
    setEmissaoError(null); // Limpar erro ao navegar
    
    // Marcar erro no campo do formulário
    setError(fieldPath as any, { 
      type: 'manual', 
      message: emissaoError?.error || 'Campo inválido' 
    });
    
    // Navegar para o step correspondente
    if (fieldPath.startsWith('embalagem.')) {
      onBack(); // Volta para step 3, depois o usuário pode voltar mais
      toast.info('Verifique os dados da embalagem no passo anterior');
    } else if (fieldPath.startsWith('destinatario.')) {
      onBack();
      toast.info('Verifique os dados do destinatário');
    } else if (fieldPath === 'remetenteId') {
      onBack();
      toast.info('Verifique o remetente selecionado');
    }
  };

  return (
    <>
    {/* Exibir erro estruturado se houver */}
    {emissaoError && (
      <EmissaoErrorAlert 
        error={emissaoError}
        onDismiss={() => setEmissaoError(null)}
        onFieldClick={handleFieldErrorClick}
      />
    )}
    
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

        {/* Declaração de Conteúdo */}
        {formData.itensDeclaracaoConteudo && formData.itensDeclaracaoConteudo.length > 0 && (
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="font-bold text-base text-foreground">Declaração de Conteúdo</h3>
              <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                {formData.itensDeclaracaoConteudo.length} {formData.itensDeclaracaoConteudo.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="space-y-2">
              {formData.itensDeclaracaoConteudo.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <span className="text-sm font-medium text-foreground">{item.conteudo}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Qtd: {item.quantidade}</span>
                    <span className="font-semibold text-foreground">R$ {item.valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
    
    {/* Modal de Recarga PIX */}
    <ModalRecargaPix
      isOpen={showPixModal}
      onClose={() => {
        setShowPixModal(false);
        setPixChargeData(undefined);
        // Se há emissão pendente e modal está fechando, tentar processar
        if (emissaoPendente) {
          console.log('🔄 Tentando processar emissão pendente após fechamento do modal...');
          setTimeout(() => {
            processarEmissao(emissaoPendente);
          }, 500);
        }
      }}
      chargeData={pixChargeData}
      saldoInicial={saldoAtual}
      clienteId={user?.clienteId || ''}
      onPaymentConfirmed={() => {
        console.log('💰 Pagamento confirmado! Processando emissão...');
        setShowPixModal(false);
        if (emissaoPendente) {
          setTimeout(() => {
            processarEmissao(emissaoPendente);
          }, 500);
        }
      }}
    />
    </>
  );
};
