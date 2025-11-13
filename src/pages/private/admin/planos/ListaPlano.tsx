import { useState } from "react";
import type { IPlano } from "../../../../types/IPlano";
import { PlanoService } from "../../../../services/PlanoService";
import { format } from "date-fns";
import { useLayout } from "../../../../providers/LayoutContext";
import { useGlobalConfig } from "../../../../providers/GlobalConfigContext";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { Content } from "../../Content";
import { LoadSpinner } from "../../../../components/loading";
import { TableCustom } from "../../../../components/table";
import { Paginacao } from "../../../../components/paginacao";
import { TableDropdown } from "../../../../components/table/dropdown";


export const ListaPlano = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);
    const { layout } = useLayout();

    const service = new PlanoService();

    const { data: planos, isLoading, isError } = useFetchQuery<IPlano[]>(
        ['planos'],
        async () => (await service.getAll()).data
    )
    const [data, setData] = useState<IPlano[]>(); // Dados carregados

    return (
        <Content
            titulo="Planos"
            subTitulo="Lista de planos cadastradas no sistema"
            isButton
            button={[{ label: "Adicionar plano", link:  `/${layout}/planos/adicionar` }]}
            data={(planos && planos.length > 0) ? planos : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && planos && planos.length > 0 && (
                <div className=" rounded-lg">

                    <TableCustom
                        thead={['Nome', 'Percentual', 'Status', 'Criado em', 'Ações']}
                    >
                        {data && data.map((plano: IPlano) => (
                            <tr key={plano.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                <td className="px-4 py-3 flex-col flex">
                                    <span className="font-medium">{plano.nome}</span>
                                    <span className="font-medium text-xs text-slate-400">
                                        {plano.descricao}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{plano.percentual}</td>
                                <td className="px-4 py-3">{plano.status}</td>
                                <td className="px-4 py-3">{format(new Date(plano?.criadoEm || ''), 'dd/MM/yyyy') || plano.criadoEm}</td>
                                <td className="px-4 py-3 text-right">
                                    <TableDropdown dropdownKey={plano.id}
                                        items={[
                                            {
                                                id: 'editar',
                                                label: 'Editar',
                                                type: 'link',
                                                to: `/${layout}/planos/editar/${plano.id}`,
                                                isShow: true
                                            }
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </TableCustom>
                    <div className="py-3">
                        {planos && planos.length > 0 && (
                            <Paginacao data={planos} setData={setData} dataPerPage={page.perPage} />
                        )}
                    </div>
                </div>
            )}
        </Content>
    );
};