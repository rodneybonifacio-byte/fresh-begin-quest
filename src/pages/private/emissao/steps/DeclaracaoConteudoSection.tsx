import { useState } from 'react';
import { PlusCircle, Trash2, FileText } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { InputField } from '../../../../components/InputField';
import { ButtonComponent } from '../../../../components/button';
import type { IEmissaoItensDeclaracaoConteudo } from '../../../../types/IEmissao';
import { formatCurrency, formatNumberString } from '../../../../utils/formatCurrency';

export const DeclaracaoConteudoSection = () => {
  const { setValue, getValues } = useFormContext();
  const [itens, setItens] = useState<IEmissaoItensDeclaracaoConteudo[]>(
    () => getValues('itensDeclaracaoConteudo') || []
  );

  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valor, setValor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addItem = () => {
    const newErrors: Record<string, string> = {};
    if (!descricao.trim()) newErrors.descricao = 'Obrigatório';
    else if (descricao.trim().length < 3) newErrors.descricao = 'Descrição muito curta. Informe o item real.';
    if (!quantidade.trim() || Number(quantidade) <= 0) newErrors.quantidade = 'Obrigatório';
    if (!valor.trim() || formatNumberString(valor) === '0' || formatNumberString(valor) === '0.00') newErrors.valor = 'Informe o valor real do item';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const novoItem: IEmissaoItensDeclaracaoConteudo = {
      conteudo: descricao.trim(),
      quantidade: quantidade.trim(),
      valor: formatNumberString(valor),
    };

    const novaLista = [...itens, novoItem];
    setItens(novaLista);
    setValue('itensDeclaracaoConteudo', novaLista);

    setDescricao('');
    setQuantidade('');
    setValor('');
    setErrors({});
  };

  const removeItem = (index: number) => {
    const novaLista = itens.filter((_, i) => i !== index);
    setItens(novaLista);
    setValue('itensDeclaracaoConteudo', novaLista);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
        </div>
         <div>
          <h4 className="font-semibold text-foreground">Declaração de Conteúdo</h4>
          <p className="text-xs text-muted-foreground">
            Informe os itens e o valor total de cada mercadoria
          </p>
        </div>
      </div>

      {/* Aviso de fidelidade */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
          ⚠️ Obrigatório: A declaração deve conter a descrição real e fiel dos itens enviados, com quantidades e valores corretos. Declarações falsas ou genéricas podem resultar em multa e apreensão pela fiscalização postal.
        </p>
      </div>

      {/* Form de adicionar item */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label="Descrição do item"
            placeholder="Ex: Camiseta"
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              if (errors.descricao) setErrors((p) => ({ ...p, descricao: '' }));
            }}
            error={errors.descricao}
          />
          <InputField
            label="Quantidade"
            type="number"
            min="1"
            step="1"
            placeholder="1"
            value={quantidade}
            onChange={(e) => {
              setQuantidade(e.target.value);
              if (errors.quantidade) setErrors((p) => ({ ...p, quantidade: '' }));
            }}
            error={errors.quantidade}
          />
          <InputField
            label="Valor (R$)"
            placeholder="0,00"
            value={valor}
            onChange={(e) => {
              setValor(formatCurrency(e.target.value));
              if (errors.valor) setErrors((p) => ({ ...p, valor: '' }));
            }}
            error={errors.valor}
          />
        </div>
        <ButtonComponent
          type="button"
          variant="secondary"
          onClick={addItem}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="h-4 w-4" /> Adicionar Item
        </ButtonComponent>
      </div>

      {/* Lista de itens */}
      {itens.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Valor mercadoria
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Subtotal
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itens.map((item, index) => {
                  const subtotal = parseFloat(item.valor) || 0;
                  return (
                    <tr key={index} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{item.conteudo}</td>
                      <td className="px-4 py-3 text-sm text-foreground text-center">{item.quantidade}</td>
                      <td className="px-4 py-3 text-sm text-foreground text-right">R$ {item.valor}</td>
                      <td className="px-4 py-3 text-sm text-foreground text-right font-medium">R$ {subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {itens.length} {itens.length === 1 ? 'item' : 'itens'} adicionados
            </span>
            <span className="text-sm font-semibold text-foreground">
              Total: R$ {itens.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {itens.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Adicione pelo menos 1 item para gerar a declaração de conteúdo
        </p>
      )}
    </div>
  );
};
