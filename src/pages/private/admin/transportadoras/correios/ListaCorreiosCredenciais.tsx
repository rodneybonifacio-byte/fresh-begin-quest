import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { LoadSpinner } from "../../../../../components/loading";
import { Paginacao } from "../../../../../components/paginacao";
import { TableCustom } from "../../../../../components/table";
import { TableDropdown } from "../../../../../components/table/dropdown";
import { useCredencialCorreios } from "../../../../../hooks/useCredencialCorreios";
import { useFetchQuery } from "../../../../../hooks/useFetchQuery";
import { useGlobalConfig } from "../../../../../providers/GlobalConfigContext";
import { useLayout } from "../../../../../providers/LayoutContext";
import { useLoadingSpinner } from "../../../../../providers/LoadingSpinnerContext";
import { CorreriosService } from "../../../../../services/CorreriosService";
import type { ICorreiosCredencial } from "../../../../../types/ICorreiosCredencial";
import { Content } from "../../../Content";
import { ModalAdicionarAporteCredito } from "./ModalAdicionarAporteCredito";

export const ListaCorreiosCredenciais = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);
    const { setIsLoading } = useLoadingSpinner();
    const { layout } = useLayout();
    const { onAtivaCredencial } = useCredencialCorreios();
    const [isModalAddCreditos, setIsModalAddCreditos] = useState<{ isOpen: boolean, credencial: ICorreiosCredencial }>(
        { isOpen: false, credencial: {} as ICorreiosCredencial }
    );

    const service = new CorreriosService();

    const { data: credencials, isLoading, isError } = useFetchQuery<ICorreiosCredencial[]>(
        ['credenciais'],
        async () => (await service.getCredenciais()).data
    )
    const [data, setData] = useState<ICorreiosCredencial[]>(); // Dados carregados

    useEffect(() => {
        setData(credencials);
        localStorage.removeItem("credencialEdicao");
    }, [credencials]);

    const handleOnAtivar = async (credencial: ICorreiosCredencial) => {
        onAtivaCredencial(credencial, setIsLoading);
    }


    return (
        <Content
            titulo="Credenciais de Correios"
            subTitulo="Lista de credenciais de correios cadastradas no sistema"
            isButton
            button={[{ label: "Adicionar Credencial", icon: <Plus size={22} className="text-white" />, link: `/${layout}/correios/credenciais/adicionar` }]}
            data={(credencials && credencials.length > 0) ? credencials : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && credencials && credencials.length > 0 && (
                <div className=" rounded-lg">

                    <TableCustom
                        thead={['Descrição', 'CNPJ', 'Cartão de postagem', 'Credito R$', 'Contrato', 'Status', 'Criado em', 'Ações']}
                    >
                        {data && data.map((credencial: ICorreiosCredencial) => (
                            <tr key={credencial.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                <td className="px-4 py-3 flex-col flex">
                                    <span className="font-medium">{credencial.descricao}</span>
                                    <span className="font-medium text-xs text-slate-400">
                                        {credencial.contrato}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{credencial.usuario}</td>
                                <td className="px-4 py-3">{credencial.cartaoPostagem}</td>
                                <td className="px-4 py-3 flex-col flex">
                                    <span className="font-medium text-base">{Number(credencial.creditoDisponivel)}</span>
                                    <span className="font-medium text-xs text-slate-400">
                                        {Number(credencial.limiteValorContrato)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{credencial.tipoContrato}</td>
                                <td className="px-4 py-3">{credencial.status}</td>
                                <td className="px-4 py-3">{format(new Date(credencial?.criadoEm || ''), 'dd/MM/yyyy') || credencial.criadoEm}</td>
                                <td className="px-4 py-3 text-right">
                                    <TableDropdown dropdownKey={credencial.id || ''}
                                        items={[
                                            {
                                                id: 'editar',
                                                label: 'Editar',
                                                type: 'link',
                                                to: `/${layout}/correios/credenciais/editar/${credencial.id}`,
                                                isShow: true
                                            },
                                            {
                                                id: 'ativar-inativar',
                                                label: 'Ativar/Desativar',
                                                type: 'link',
                                                onClick: () => handleOnAtivar(credencial),
                                                isShow: true
                                            },
                                            {
                                                id: 'adicionar-creditos',
                                                label: 'Adicionar Creditos',
                                                type: 'button',
                                                onClick: () => {
                                                    setIsModalAddCreditos({
                                                        isOpen: true,
                                                        credencial: credencial
                                                    });
                                                },
                                                isShow: true
                                            }
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </TableCustom>
                    <div className="py-3">
                        {credencials && credencials.length > 0 && (
                            <Paginacao data={credencials} setData={setData} dataPerPage={page.perPage} />
                        )}
                    </div>
                </div>
            )}
            <ModalAdicionarAporteCredito data={isModalAddCreditos?.credencial} isOpen={isModalAddCreditos?.isOpen} onClose={() => setIsModalAddCreditos({ isOpen: false, credencial: {} as ICorreiosCredencial })} />
        </Content>
    );
};