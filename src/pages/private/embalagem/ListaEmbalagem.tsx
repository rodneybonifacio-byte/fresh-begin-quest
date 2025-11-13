import { useState } from "react";
import { Content, type ContentButtonProps } from "../Content";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { TableCustom } from "../../../components/table";
import { Paginacao } from "../../../components/paginacao";
import { useGlobalConfig } from "../../../providers/GlobalConfigContext";
import { LoadSpinner } from "../../../components/loading";
import { ModalNovaEmbalagem } from "./ModalNovaEmbalagem";
import { EmbalagemService } from "../../../services/EmbalagemService";
import type { IEmbalagem } from "../../../types/IEmbalagem";


export const ListaEmbalagem = () => {
    const config = useGlobalConfig();
    const [page] = useState(config.pagination);

    const [isModalOpenEmbalagem, setIsModalOpenEmbalagem] = useState<boolean>(false);

    const service = new EmbalagemService();

    const { data: embalagens, isLoading, isError } = useFetchQuery<IEmbalagem[]>(
        ['embalagens'],
        async () => (await service.getAll()).data
    )
    const [data, setData] = useState<IEmbalagem[]>(); // Dados carregados

    const contentButton: ContentButtonProps[] = [
        {
            label: "Adicionar",
            onClick: () => setIsModalOpenEmbalagem(true)
        }
    ]

    return (
        <Content
            titulo="Embalagens"
            subTitulo="Lista de embalagens cadastradas no sistema"
            isButton
            button={contentButton}
            data={(embalagens && embalagens.length > 0) ? embalagens : []}
        >
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}
            {!isLoading && !isError && embalagens && embalagens.length > 0 && (
                <div className=" rounded-lg">

                    <TableCustom
                        thead={['Nome', 'Dimensões']}
                    >
                        {data && data.map((embalagem: IEmbalagem) => (
                            <tr key={embalagem.id} className={`hover:bg-gray-50 cursor-pointer`}>
                                <td className="px-4 py-3 flex-col flex">
                                    <span className="font-medium">{embalagem.descricao}</span>
                                    <span className="font-medium text-xs text-slate-400">
                                       {embalagem.formatoObjeto}
                                    </span>
                                </td>
                                <td>{embalagem.altura} x {embalagem.largura} x {embalagem.comprimento} x {embalagem.peso}</td>
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
                        {embalagens && embalagens.length > 0 && (
                            <Paginacao data={embalagens} setData={setData} dataPerPage={page.perPage} />
                        )}
                    </div>
                </div>
            )}

             <ModalNovaEmbalagem isOpen={isModalOpenEmbalagem} onCancel={() => setIsModalOpenEmbalagem(false)} />
        </Content>
    );
};