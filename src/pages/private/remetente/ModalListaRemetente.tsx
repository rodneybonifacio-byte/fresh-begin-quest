import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { ModalCustom } from "../../../components/modal";
import { InputLabel } from "../../../components/input-label";
import { ButtonComponent } from "../../../components/button";
import { ArrowRight, Plus } from "lucide-react";
import { formatCpfCnpj } from "../../../utils/lib.formats";
import { truncateText } from "../../../utils/funcoes";
import { RemetenteSupabaseService } from "../../../services/RemetenteSupabaseService";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import type { IRemetente } from "../../../types/IRemetente";

export const ModalListaRemetente: React.FC<{ isOpen: boolean; onCancel: () => void, onSelect: (remetente: any) => void; }> = ({
    isOpen,
    onCancel,
    onSelect
}) => {
    const [data, setData] = useState<IRemetente[]>([]);
    const [busca, setBusca] = useState('');
    const service = new RemetenteSupabaseService();

    const { data: remetentes, isLoading: isLoadingRemetentes, error } = useFetchQuery<IRemetente[]>(
        ['remetentes-supabase'],
        async () => {
            const response = await service.getAll();
            return response.data ?? [];
        },
        {
            enabled: isOpen
        });

    useEffect(() => {
        if (remetentes) {
            setData(remetentes);
        }
    }, [remetentes]);

    // Fuse.js config
    const fuse = useMemo(() => {
        return new Fuse(data, {
            keys: ['nome', 'cpfCnpj'],
            threshold: 0.3,
            ignoreLocation: true,
            minMatchCharLength: 2,
        });
    }, [data]);

    const filtrados = useMemo(() => {
        const buscaNormalizada = busca.trim();
        return buscaNormalizada ? fuse.search(buscaNormalizada).map(res => res.item) : data;
    }, [busca, fuse, data]);


    if (!isOpen) return null;
    return (
        <ModalCustom
            title="Selecionar Remetente"
            description="Selecione um remetente existente ou crie um novo."
            onCancel={onCancel}>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">
                        {data.length} remetente(s) cadastrado(s)
                    </p>
                </div>

                {data.length === 0 && !isLoadingRemetentes && !error ? (
                    <div className="flex flex-col gap-4 p-6 bg-muted/50 border border-border rounded-lg text-center">
                        <p className="text-sm font-medium">📦 Nenhum remetente cadastrado</p>
                        <p className="text-xs text-muted-foreground">
                            Para adicionar remetentes, acesse o menu "Remetentes" e cadastre seus endereços de origem.
                        </p>
                        <ButtonComponent
                            type="button"
                            variant="primary"
                            size="small"
                            onClick={() => {
                                onCancel();
                                window.location.href = '/app/remetentes';
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Cadastrar Remetente
                        </ButtonComponent>
                    </div>
                ) : isLoadingRemetentes ? (
                    <p className="text-center py-4">Carregando remetentes...</p>
                ) : error ? (
                    <div className="flex flex-col gap-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                        <p className="text-sm text-destructive font-medium">⚠️ Erro ao carregar remetentes</p>
                        <p className="text-xs text-muted-foreground">
                            Tente recarregar a página ou entre em contato com o suporte.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <InputLabel
                            labelTitulo="Pesquisar Remetente"
                            placeholder="Digite o nome ou CPF/CNPJ"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                        <p className="text-sm text-gray-500">Selecione um remetente da lista abaixo:</p>
                        <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-2">
                            {filtrados.length === 0 ? (
                                <li className="text-sm text-center text-gray-500 dark:text-gray-400 p-2">
                                    Nenhum remetente encontrado.
                                </li>
                            ) : (
                                filtrados.map(remetente => (
                                    <li key={remetente.id} className="flex w-full flex-row border border-gray-200 dark:border-gray-600 p-2 justify-between rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <div className="flex flex-col w-full mr-4">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{truncateText(remetente.nome, 50)}</span>
                                            <small className="text-xs text-gray-600 dark:text-gray-400">{formatCpfCnpj(remetente.cpfCnpj)}</small>
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <ButtonComponent variant="primary" border="outline" type="button"
                                                onClick={() => onSelect(remetente)}>
                                                <ArrowRight className="w-3 h-3" />
                                            </ButtonComponent>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </ModalCustom>
    );
};
