import { useEffect, useState } from "react";
 
import { format } from "date-fns";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { Content } from "../../Content";
import { LoadSpinner } from "../../../../components/loading";
import { TableCustom } from "../../../../components/table";
import { StatusBadgeEmissao } from "../../../../components/StatusBadgeEmissao";
import { Plus } from "lucide-react";
import { ManifestoService } from "../../../../services/ManifestoService";
import type { IManifesto } from "../../../../types/IManifesto";
import { PaginacaoCustom } from "../../../../components/PaginacaoCustom";
import { useGlobalConfig } from "../../../../providers/GlobalConfigContext";
import type { IResponse } from "../../../../types/IResponse";

const FManifestos = () => {
    // const { setIsLoading } = useLoadingSpinner();
    const service = new ManifestoService();
    const [page, setPage] = useState<number>(1);
    const [data, setData] = useState<IManifesto[]>([]);
    const config = useGlobalConfig();
    const perPage = config.pagination.perPage;

    const { data: manifesto, isLoading, isError } = useFetchQuery<IResponse<IManifesto[]>>(
        ["manifestos"],
        async () => {
            const params: { limit: number; offset: number } = {
                limit: perPage,
                offset: (page - 1) * perPage,
            };

            return (await service.getAll(params))
        }
    );
    


    useEffect(() => {
        if (manifesto?.data) {
            setData(manifesto.data);
        }
    }, [manifesto]);

    const handlePageChange = async (pageNumber: number) => {
        setPage(pageNumber);
    };
    return (
        <Content
            titulo="Ferramentas - Manifestos"
            subTitulo="Aqui você pode visualizar e gerenciar os manifestos de postagem."
            isButton
            button={[
                {
                    label: "Criar Manifesto",
                    icon: <Plus size={22} className="text-white" />,
                    link: "/app/ferramentas/manifestos/adicionar",
                },
            ]}
            data={(manifesto?.data && manifesto.data.length > 0) ? manifesto.data : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && manifesto && manifesto.data.length > 0 && (
                <div className="rounded-lg flex flex-col gap-2">
                    <div className="md:lg:xl:block">
                        <TableCustom thead={['N° do Manifesto', 'Total de objeto', 'Status', 'Criado em']}>
                            {data && data.map((manifesto: IManifesto) => (
                                <tr key={manifesto.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                    <td className="px-4 py-3">{manifesto.codigoManifesto || '-------------'}</td>
                                    <td className="px-4 py-3">{manifesto.totalObjetos || '-------------'}</td>

                                    <StatusBadgeEmissao status={manifesto.status} handleOnViewErroPostagem={() => console.log('manifesto.mensagensErrorPostagem')} />

                                    <td className="px-4 py-3">{format(new Date(manifesto?.criadoEm || ''), 'dd/MM/yyyy') || manifesto.criadoEm}</td>
                                </tr>
                            ))}
                        </TableCustom>

                        <div className="py-3">
                            <PaginacaoCustom meta={manifesto?.meta} onPageChange={handlePageChange} />
                        </div>
                    </div>
                </div>
            )}
        </Content>
    );
};

export default FManifestos;