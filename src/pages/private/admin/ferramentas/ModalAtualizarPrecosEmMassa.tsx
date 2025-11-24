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

export const ModalAtualizarPrecosEmMassa = ({ 
  isOpen, 
  selectedIds, 
  onClose,
  onSuccess 
}: ModalAtualizarPrecosEmMassaProps) => {
  const { setIsLoading } = useLoadingSpinner();
  const queryClient = useQueryClient();
  const service = new EmissaoService();

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
      
      const batchSize = 10;
      const results: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        
        try {
          const promises = batch.map(async (emissaoId) => {
            try {
              const inputData = {
                emissaoId,
                tipoAtualizacao: input.tipoAtualizacao,
                valor: formatNumberString(input.valor || ''),
                modoAtualizacao: input.modoAtualizacao,
              };

              const response = await service.atualizarPrecos(emissaoId, inputData);
              return { success: true, emissaoId, response };
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

  const handleOnAtualizarPrecos = async (formData: FormAtualizarPrecosEmMassa) => {
    try {
      await mutation.mutateAsync(formData);
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalCustom 
      title="Atualizar Preços em Massa" 
      description={`Atualizar preços de ${selectedIds.length} etiqueta(s) selecionada(s)`} 
      onCancel={onClose} 
      size="small"
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleOnAtualizarPrecos)} className="flex flex-col gap-4">
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
              Atualizar {selectedIds.length} Etiqueta(s)
            </ButtonComponent>
          </div>
        </form>
      </FormProvider>
    </ModalCustom>
  );
};
