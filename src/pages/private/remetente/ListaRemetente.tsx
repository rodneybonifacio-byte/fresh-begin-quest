import { useState } from "react";
import { Content, type ContentButtonProps } from "../Content";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { TableCustom } from "../../../components/table";
import { Paginacao } from "../../../components/paginacao";
import { useGlobalConfig } from "../../../providers/GlobalConfigContext";
import { LoadSpinner } from "../../../components/loading";
import { formatCpfCnpj } from "../../../utils/lib.formats";
import { RemetenteService } from "../../../services/RemetenteService";
import type { IRemetente } from "../../../types/IRemetente";
import { ModalCadastrarRemetente } from "./ModalCadastrarRemetente";


export const ListaRemetente = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);

    const [isModalOpenRemetente, setIsModalOpenRemetente] = useState<boolean>(false);

    const service = new RemetenteService();

    const { data: remetentes, isLoading, isError } = useFetchQuery<IRemetente[]>(
        ['remetentes'],
        async () => (await service.getAll()).data
    )
    const [data, setData] = useState<IRemetente[]>(); // Dados carregados

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
            {!isLoading && !isError && remetentes && remetentes.length > 0 && (
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

            <ModalCadastrarRemetente isOpen={isModalOpenRemetente} onCancel={() => setIsModalOpenRemetente(false)} />
        </Content>
    );
};