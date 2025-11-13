import { useEffect, useState } from "react";
import { useGlobalConfig } from "../../../providers/GlobalConfigContext";
import { UsuarioService } from "../../../services/UsuarioService";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import type { IUsuario } from "../../../types/IUsuario";
import { format } from "date-fns";
import { Content } from "../Content";
import { LoadSpinner } from "../../../components/loading";
import { TableCustom } from "../../../components/table";
import { Paginacao } from "../../../components/paginacao";
import { TableDropdown } from "../../../components/table/dropdown";

export const ListaUsuarios = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);

    const service = new UsuarioService();

    const { data: responseUsuarios, isLoading, isError } = useFetchQuery<IUsuario[]>(
        ['usuarios'],
        async () => (await service.getAll()).data
    )
    const [usuarios, setVenda] = useState<IUsuario[]>(); // Dados carregados

    useEffect(() => {
        if (responseUsuarios) {
            setVenda(responseUsuarios);
        }
    }, [responseUsuarios]);

    return (
        <Content
            titulo="Usuarios"
            subTitulo="Lista de usuarios cadastrados no sistema"
            button={[{
                label: "Adicionar usuario",
                link: "/usuarios/adicionar"
            }]}
            data={usuarios}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && usuarios && usuarios.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <TableCustom
                        thead={['Nome', 'E-mail', 'Status', 'Criado em', 'Ações']}
                    >
                        {usuarios && usuarios.map((usuario: IUsuario) => (
                            <tr key={usuario.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                <td className="px-4 py-3">
                                    <span className="font-medium">{usuario.nome} {usuario.sobrenome}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-medium">{usuario.email}</span>
                                </td>
                                <td className="px-4 py-3">{usuario.status}</td>
                                <td className="px-4 py-3">{format(new Date(usuario.criadoEm), 'dd/MM/yyyy') || usuario.criadoEm}</td>
                                <td className="px-4 py-3 text-right">
                                    <TableDropdown dropdownKey={usuario.id} items={[
                                        {
                                            id: 'editar',
                                            label: 'Editar',
                                            type: 'link',
                                            to: `/usuarios/editar/${usuario.id}`
                                        },
                                        {
                                            id: 'vermais',
                                            label: 'Ver mais',
                                            type: 'link',
                                            to: '/usuarios/detail/' + usuario.id
                                        }
                                    ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </TableCustom>

                    {usuarios && usuarios.length > page.perPage && (
                        <Paginacao data={usuarios || []} setData={setVenda} dataPerPage={page.perPage} />
                    )}
                </div>
            )}
        </Content>
    );
}