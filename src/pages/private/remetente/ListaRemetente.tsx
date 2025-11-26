import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Content, type ContentButtonProps } from "../Content";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { TableCustom } from "../../../components/table";
import { Paginacao } from "../../../components/paginacao";
import { useGlobalConfig } from "../../../providers/GlobalConfigContext";
import { LoadSpinner } from "../../../components/loading";
import { formatCpfCnpj } from "../../../utils/lib.formats";
import { RemetenteSupabaseDirectService } from "../../../services/RemetenteSupabaseDirectService";
import type { IRemetente } from "../../../types/IRemetente";
import { ModalCadastrarRemetente } from "./ModalCadastrarRemetente";


export const ListaRemetente = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isModalOpenRemetente, setIsModalOpenRemetente] = useState<boolean>(false);
    const [isFromAutoCadastro, setIsFromAutoCadastro] = useState<boolean>(false);
    const [wasModalClosedManually, setWasModalClosedManually] = useState<boolean>(false);

    const service = new RemetenteSupabaseDirectService();

    const { data: remetentes, isLoading, isError } = useFetchQuery<IRemetente[]>(
        ['remetentes'],
        async () => (await service.getAll()).data
    )
    const [data, setData] = useState<IRemetente[]>(); // Dados carregados

    // Abrir modal automaticamente quando: 
    // 1. Veio do autocadastro (parâmetro from=autocadastro na URL), OU
    // 2. Não há remetentes cadastrados (lista vazia ou erro ao buscar)
    useEffect(() => {
        const fromCadastro = searchParams.get('from') === 'autocadastro';
        
        console.log('🔍 Verificando remetentes:', { 
            isLoading,
            fromCadastro,
            remetentesLength: remetentes?.length,
            isError,
            isModalOpen: isModalOpenRemetente,
            wasClosedManually: wasModalClosedManually
        });

        // Não reabre se o usuário fechou manualmente
        if (isLoading || isModalOpenRemetente || wasModalClosedManually) return;

        const qtdRemetentes = remetentes?.length ?? 0;
        const shouldOpenModal = fromCadastro || isError || qtdRemetentes === 0;

        if (shouldOpenModal) {
            console.log('✅ Abrindo modal:', {
                motivo: fromCadastro ? 'veio do autocadastro' : (isError ? 'erro ao buscar' : 'sem remetentes')
            });
            
            setIsFromAutoCadastro(fromCadastro);
            setIsModalOpenRemetente(true);
            
            // Limpar o parâmetro da URL se veio do autocadastro
            if (fromCadastro) {
                navigate('/app/remetentes', { replace: true });
            }
        }
    }, [isLoading, remetentes, isError, searchParams, navigate, isModalOpenRemetente, wasModalClosedManually]);

    const contentButton: ContentButtonProps[] = [
        {
            label: "Adicionar",
            onClick: () => setIsModalOpenRemetente(true)
        }
    ]

    return (
        <Content
            titulo="Remetentes"
            subTitulo="Lista de remetentes cadastradas no sistema"
            isButton
            button={contentButton}
            data={(remetentes && remetentes.length > 0) ? remetentes : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && remetentes && remetentes.length > 0 && (
                <div className=" rounded-lg">

                    <TableCustom
                        thead={['Nome', 'CPF/CNPJ']}
                    >
                        {data && data.map((remetente: IRemetente) => (
                            <tr key={remetente.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                <td className="px-4 py-3 flex-col flex">
                                    <span className="font-medium">{remetente.nome}</span>
                                    <span className="font-medium text-xs text-slate-400">
                                        {remetente.endereco?.logradouro}, {remetente.endereco?.numero} {remetente.endereco?.complemento}, {remetente.endereco?.bairro} - {remetente.endereco?.localidade} - {remetente.endereco?.uf}
                                    </span>
                                </td>
                                <td> {formatCpfCnpj(remetente?.cpfCnpj || '')}</td>
                                {/* <td className="px-4 py-3 text-right">
                                    <TableDropdown dropdownKey={index.toString()}
                                        items={[
                                            {
                                                id: 'editar',
                                                label: 'Editar',
                                                type: 'link',
                                                to: `/emissaos/editar/${remetente.id}`,
                                                isShow: true
                                            },
                                            {
                                                id: 'vermais',
                                                label: 'Ver mais',
                                                type: 'link',
                                                to: '/emissaos/detail/' + remetente.id,
                                                isShow: true
                                            }
                                        ]}
                                    />
                                </td> */}
                            </tr>
                        ))}
                    </TableCustom>
                    <div className="py-3">
                        {remetentes && remetentes.length > 0 && (
                            <Paginacao data={remetentes} setData={setData} dataPerPage={page.perPage} />
                        )}
                    </div>
                </div>
            )}

            <ModalCadastrarRemetente 
                isOpen={isModalOpenRemetente} 
                onCancel={() => {
                    setIsModalOpenRemetente(false);
                    setIsFromAutoCadastro(false);
                    setWasModalClosedManually(true);
                }}
                showWelcomeMessage={isFromAutoCadastro}
            />
        </Content>
    );
};