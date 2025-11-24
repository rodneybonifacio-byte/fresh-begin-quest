import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { ButtonComponent } from '../../../../components/button';
import { InputLabel } from '../../../../components/input-label';
import { ModalCustom } from '../../../../components/modal';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { EmissaoService } from '../../../../services/EmissaoService';
import { formatCurrency, formatNumberString } from '../../../../utils/formatCurrency';
import { toast } from 'sonner';
import { useState } from 'react';

const schemaAtualizarPrecosEmMassa = yup.object().shape({
  tipoAtualizacao: yup.string().oneOf(['VALOR_VENDA', 'VALOR_CUSTO']).required('Selecione o tipo de atualização'),
  modoAtualizacao: yup.string().oneOf(['PERCENTUAL', 'VALOR_FIXO']).required('Selecione o modo de atualização'),
  valor: yup.string().required('Informe o valor'),
});

type FormAtualizarPrecosEmMassa = yup.InferType<typeof schemaAtualizarPrecosEmMassa>;

interface ModalAtualizarPrecosEmMassaProps {
  isOpen: boolean;
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewItem {
  emissaoId: string;
  codigoObjeto?: string;
  valorVendaAtual: number;
  valorCustoAtual: number;
  novoValor: number;
}

export const ModalAtualizarPrecosEmMassa = ({ 
  isOpen, 
  selectedIds, 
  onClose,
  onSuccess 
}: ModalAtualizarPrecosEmMassaProps) => {
  const { setIsLoading } = useLoadingSpinner();
  const queryClient = useQueryClient();
  const service = new EmissaoService();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);

  const methods = useForm<FormAtualizarPrecosEmMassa>({
    defaultValues: {
      tipoAtualizacao: 'VALOR_VENDA',
      modoAtualizacao: 'PERCENTUAL',
      valor: '',
    },
    resolver: yupResolver(schemaAtualizarPrecosEmMassa),
  });

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = methods;

  const modoAtualizacao = watch('modoAtualizacao');

  const mutation = useMutation({
    mutationFn: async (input: FormAtualizarPrecosEmMassa) => {
      setIsLoading(true);
      
      // Primeiro, buscar dados das emissões selecionadas para pegar valores atuais
      const batchSize = 10;
      const results: any[] = [];
      const errors: any[] = [];

      // Se for percentual, precisamos buscar os valores atuais primeiro
      let emissoesData: Map<string, any> = new Map();
      
      if (input.modoAtualizacao === 'PERCENTUAL') {
        try {
          console.log('Buscando dados das emissões para calcular percentual...');
          const fetchPromises = selectedIds.map(async (id) => {
            try {
              const response = await service.getById(id);
              return { id, data: response.data };
            } catch (err) {
              console.error(`Erro ao buscar emissão ${id}:`, err);
              return null;
            }
          });
          
          const fetchedData = await Promise.all(fetchPromises);
          fetchedData.forEach((item) => {
            if (item) {
              emissoesData.set(item.id, item.data);
            }
          });
          
          console.log(`Dados buscados: ${emissoesData.size} emissões`);
        } catch (err) {
          console.error('Erro ao buscar dados das emissões:', err);
          toast.error('Erro ao buscar dados das etiquetas');
          setIsLoading(false);
          throw err;
        }
      }

      // Processar atualizações em lotes
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        
        try {
          const promises = batch.map(async (emissaoId) => {
            try {
              let valorFinal: string;
              
              if (input.modoAtualizacao === 'PERCENTUAL') {
                // Calcular valor com percentual
                const emissaoData = emissoesData.get(emissaoId);
                if (!emissaoData) {
                  throw new Error('Dados da emissão não encontrados');
                }
                
                // Pegar valor atual baseado no tipo de atualização
                const valorAtual = input.tipoAtualizacao === 'VALOR_VENDA' 
                  ? parseFloat(emissaoData.valor || emissaoData.valorPostagem || '0')
                  : parseFloat(emissaoData.valorPostagem || '0');
                
                // Calcular percentual (converter string para número)
                const percentual = parseFloat(input.valor.replace(',', '.'));
                
                // Aplicar percentual: valor_atual * (1 + percentual/100)
                // Para -18%, seria: valor_atual * (1 - 0.18) = valor_atual * 0.82
                const novoValor = valorAtual * (1 + percentual / 100);
                
                valorFinal = novoValor.toFixed(2);
                
                console.log(`Emissão ${emissaoId}: Valor atual R$ ${valorAtual.toFixed(2)} → ${percentual}% → Novo valor R$ ${valorFinal}`);
              } else {
                // VALOR_FIXO: usar valor direto
                valorFinal = formatNumberString(input.valor || '');
              }

              const inputData = {
                emissaoId,
                tipoAtualizacao: input.tipoAtualizacao,
                valor: valorFinal,
              };

              const response = await service.atualizarPrecos(emissaoId, inputData);
              return { success: true, emissaoId, response, valorFinal };
            } catch (err) {
              console.error(`Erro ao atualizar ${emissaoId}:`, err);
              errors.push({ emissaoId, error: err });
              return { success: false, emissaoId, error: err };
            }
          });

          const batchResults = await Promise.all(promises);
          results.push(...batchResults.filter(r => r.success));
        } catch (error) {
          console.error(`Erro no lote ${i / batchSize + 1}:`, error);
          errors.push({ batch, error });
        }
      }

      return { results, errors };
    },
    onSuccess: (data) => {
      setIsLoading(false);
      const { results, errors } = data;
      
      if (errors.length > 0) {
        toast.warning(`${results.length} atualizadas com sucesso. ${errors.length} com erro.`);
        console.error('Erros detalhados:', errors);
      } else {
        toast.success(`${results.length} etiquetas atualizadas com sucesso!`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['emissoes-gerenciar'] });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      setIsLoading(false);
      console.error('Erro geral na atualização:', error);
      toast.error("Erro ao atualizar preços");
    }
  });

  const handleGeneratePreview = async (formData: FormAtualizarPrecosEmMassa) => {
    try {
      setIsLoading(true);
      
      // Buscar dados das emissões selecionadas
      const fetchPromises = selectedIds.map(async (id) => {
        try {
          const response = await service.getById(id);
          return { id, data: response.data };
        } catch (err) {
          console.error(`Erro ao buscar emissão ${id}:`, err);
          return null;
        }
      });
      
      const fetchedData = await Promise.all(fetchPromises);
      const preview: PreviewItem[] = [];
      
      fetchedData.forEach((item) => {
        if (item) {
          const emissaoData = item.data;
          const valorVendaAtual = parseFloat(String(emissaoData.valor || emissaoData.valorPostagem || '0'));
          const valorCustoAtual = parseFloat(String(emissaoData.valorPostagem || '0'));
          
          let novoValor: number;
          
          if (formData.modoAtualizacao === 'PERCENTUAL') {
            const percentual = parseFloat(formData.valor.replace(',', '.'));
            const valorBase = formData.tipoAtualizacao === 'VALOR_VENDA' ? valorVendaAtual : valorCustoAtual;
            novoValor = valorBase * (1 + percentual / 100);
          } else {
            novoValor = parseFloat(formatNumberString(formData.valor || ''));
          }
          
          preview.push({
            emissaoId: item.id,
            codigoObjeto: emissaoData.codigoObjeto,
            valorVendaAtual,
            valorCustoAtual,
            novoValor,
          });
        }
      });
      
      setPreviewData(preview);
      setShowPreview(true);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar prévia');
      setIsLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    const formData = methods.getValues();
    try {
      await mutation.mutateAsync(formData);
      setShowPreview(false);
      setPreviewData([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBackToForm = () => {
    setShowPreview(false);
    setPreviewData([]);
  };

  if (!isOpen) return null;

  return (
    <ModalCustom 
      title="Atualizar Preços em Massa" 
      description={`Atualizar preços de ${selectedIds.length} etiqueta(s) selecionada(s)`} 
      onCancel={onClose} 
      size={showPreview ? "large" : "small"}
    >
      <FormProvider {...methods}>
        {!showPreview ? (
          <form onSubmit={handleSubmit(handleGeneratePreview)} className="flex flex-col gap-4">
          {/* Tipo de atualização */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              O que deseja atualizar?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="VALOR_VENDA"
                  {...register('tipoAtualizacao')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Valor de Venda</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="VALOR_CUSTO"
                  {...register('tipoAtualizacao')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Valor de Custo
                </span>
              </label>
            </div>
            {errors.tipoAtualizacao && (
              <span className="text-sm text-red-600">{errors.tipoAtualizacao.message}</span>
            )}
          </div>

          {/* Modo de atualização */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Como deseja atualizar?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="PERCENTUAL"
                  {...register('modoAtualizacao')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Percentual (%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="VALOR_FIXO"
                  {...register('modoAtualizacao')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Valor Fixo (R$)</span>
              </label>
            </div>
            {errors.modoAtualizacao && (
              <span className="text-sm text-red-600">{errors.modoAtualizacao.message}</span>
            )}
          </div>

          {/* Campo de valor */}
          <div className="flex flex-col w-full">
            <InputLabel
              labelTitulo={modoAtualizacao === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor (R$)'}
              type="text"
              placeholder={modoAtualizacao === 'PERCENTUAL' ? '10' : '0,00'}
              {...register('valor', {
                onChange: (e: React.FocusEvent<HTMLInputElement>) => {
                  if (modoAtualizacao === 'VALOR_FIXO') {
                    const valor = formatCurrency(e.target.value);
                    setValue('valor', valor);
                  } else {
                    // Para percentual, permitir apenas números
                    const valor = e.target.value.replace(/[^\d,.-]/g, '');
                    setValue('valor', valor);
                  }
                },
              })}
              fieldError={errors.valor?.message}
            />
            {modoAtualizacao === 'PERCENTUAL' && (
              <small className="text-xs text-gray-500 mt-1">
                Use valores positivos para aumento ou negativos para desconto (ex: 10 ou -10)
              </small>
            )}
          </div>

            <div className="flex justify-end gap-2">
              <ButtonComponent type="button" onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancelar
              </ButtonComponent>
              <ButtonComponent type="submit">
                Gerar Prévia
              </ButtonComponent>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground mb-2">
              Prévia das alterações que serão aplicadas:
            </div>
            
            <div className="max-h-[500px] overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium">Código</th>
                    <th className="px-4 py-2 text-right text-xs font-medium">Preço Venda Atual</th>
                    <th className="px-4 py-2 text-right text-xs font-medium">Preço Custo Atual</th>
                    <th className="px-4 py-2 text-right text-xs font-medium">
                      Novo {watch('tipoAtualizacao') === 'VALOR_VENDA' ? 'Preço Venda' : 'Preço Custo'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, index) => (
                    <tr key={item.emissaoId} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                      <td className="px-4 py-2 text-sm">{item.codigoObjeto || item.emissaoId.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-sm text-right">R$ {item.valorVendaAtual.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right">R$ {item.valorCustoAtual.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-primary">
                        R$ {item.novoValor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Total de {previewData.length} etiqueta(s) serão atualizadas
              </div>
              <div className="flex gap-2">
                <ButtonComponent type="button" onClick={handleBackToForm} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                  Voltar
                </ButtonComponent>
                <ButtonComponent type="button" onClick={handleConfirmUpdate}>
                  Confirmar Atualização
                </ButtonComponent>
              </div>
            </div>
          </div>
        )}
      </FormProvider>
    </ModalCustom>
  );
};
