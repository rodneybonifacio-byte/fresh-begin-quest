import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Divider } from "../../../components/divider";
import { InfoGroup } from "../../../components/InfoGroup";
import { LoadSpinner } from "../../../components/loading";
import { NotFoundData } from "../../../components/NotFoundData";
import { StatusBadge } from "../../../components/StatusBadge";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { EmissaoService } from "../../../services/EmissaoService";
import type { IEmissaoViewModel } from "../../../types/emissao/IEmissaoViewModel";
import type { IResponse } from "../../../types/IResponse";
import { formatDateTime } from "../../../utils/date-utils";
import { formatCurrencyWithCents } from "../../../utils/formatCurrency";
import { formatCpfCnpj, formatTelefone } from "../../../utils/lib.formats";
import { Content } from "../Content";

const EmissaoViewDetail = () => {
    const [emissaoId] = useParams().emissaoId ? [useParams().emissaoId] : [];
    const [emissao, setEmissao] = useState<IEmissaoViewModel>({} as IEmissaoViewModel);

    const service = new EmissaoService()

    const { data, isLoading, isError, isFetching } = useFetchQuery<IResponse<IEmissaoViewModel>>(
        ['emissao', emissaoId],
        async () => await service.findByIdWithParams(undefined, `${emissaoId}`) ?? null,
        { enabled: !!emissaoId, retry: false }
    );

    useEffect(() => {
        if (data?.data) {
            setEmissao(data.data);
        }
    }, [data]);

    // algum erro ao buscar o cliente retorna pagina anterior
    if (isError) {
        return <NotFoundData />;
    }

    if (isLoading || isFetching) {
        return <LoadSpinner mensagem="Aguarde, carregando informações da emissao..." />;
    }

    return (
        <Content
            titulo={`Emissão`}
            subTitulo="Visualização mais detalhada da emissão"
        >
            <div className="flex flex-col sm:md:lg:flex-row sm:justify-between gap-3 mb-4">
                <div className="flex flex-col sm:flex-col justify-between gap-4 flex-1">
                    <div className="bg-white dark:bg-slate-800 w-full p-6 rounded-xl flex flex-col gap-4">
                        <h1 className="text-1xl font-semibold text-slate-800 dark:text-slate-100 flex flex-col">
                            Dados do Destinatário
                        </h1>

                        <div className="flex flex-row justify-between items-center gap-1">
                            <InfoGroup label="Nome do Destinatário"
                                values={[emissao?.destinatario?.nome, emissao?.destinatario?.cpfCnpj && formatCpfCnpj(emissao?.destinatario?.cpfCnpj) || '-']}
                            />
                            <InfoGroup label="Telefone"
                                values={[emissao.destinatario && emissao.destinatario.celular && formatTelefone(emissao?.destinatario?.celular) || '-']}
                            />
                        </div>

                        <InfoGroup label="Endereço"
                            values={[`${emissao.destinatario?.endereco?.logradouro || '-'}, ${emissao.destinatario?.endereco?.numero || '-'} - ${emissao.destinatario?.endereco?.complemento || '-'} ${emissao.destinatario?.endereco?.bairro || '-'}, ${emissao.destinatario?.endereco?.localidade || '-'}-${emissao.destinatario?.endereco?.uf || '-'} ${emissao.destinatario?.endereco?.cep || '-'}`]}
                        />

                        <Divider />
                        <div className="flex flex-row justify-between items-center gap-1">
                            <InfoGroup label="Nome do Remetente"
                                values={[emissao?.remetenteNome, emissao?.remetenteCpfCnpj && formatCpfCnpj(emissao?.remetenteCpfCnpj) || '-']}
                            />
                        </div>
                        <Divider />
                        <div className="flex flex-col gap-3">

                            <h1 className="text-1xl font-semibold text-slate-800 dark:text-slate-100 flex flex-col">
                                Dados do Pacote e Frete
                            </h1>
                            <div className="flex flex-row justify-between items-center gap-1">
                                <InfoGroup label="Valor da Frete"
                                    values={[formatCurrencyWithCents(emissao?.valor || "0")]}
                                />

                                <InfoGroup label="Serviço e Prazo"
                                    values={[emissao.servico || '-', emissao.prazo + ` dias` || '-']}
                                    align="right"
                                />
                            </div>
                            <div className="flex flex-row justify-between items-center gap-1">
                                <div className={`flex flex-col gap-1`}>
                                    <span className="text-xs text-slate-900 dark:text-slate-100 font-medium">Descrição do Pacote</span>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                            {emissao?.altura && emissao?.largura && emissao?.comprimento && emissao?.peso ?
                                                `${emissao?.altura}x${emissao?.largura}x${emissao?.comprimento}`
                                                : '-'
                                            }
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                            {emissao?.peso ?
                                                `${emissao?.peso}`
                                                : '-'
                                            }
                                            <small>gramas</small>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row justify-between items-center gap-1">
                            <InfoGroup label="Codigo Objeto"
                                align="left"
                                values={[emissao.codigoObjeto || '-']}
                            />
                            <InfoGroup align="right" label="Status do Envio" values={[emissao.status && <StatusBadge status={emissao.status} tipo="envio" />]} />
                        </div>

                        <div className="flex flex-row justify-between items-center gap-1">
                            <InfoGroup label="Data de Emissão"
                                values={[formatDateTime(emissao.criadoEm) || emissao.criadoEm]}
                                align="left"
                            />
                        </div>
                    </div>
                </div>
                {emissao?.historioRastreio && emissao?.historioRastreio.length > 0 && (
                    <div className="flex flex-col sm:flex-col gap-4">
                        <div className="bg-white dark:bg-slate-800 w-full p-6 rounded-xl flex flex-col gap-4 h-[600px]">
                            <h1 className="text-1xl font-bold text-gray-800 dark:text-slate-100 flex flex-col">
                                Historico de Rastreio
                            </h1>
                            <Divider />
                            <div className="overflow-y-auto h-[500px]">
                                <div className="flex flex-col w-full gap-6 justify-start items-start sm:justify-start sm:items-start bg-white dark:bg-slate-800 p-3 rounded-lg">
                                    {(emissao.historioRastreio ?? []).map((rastreio, index) => (
                                        <div key={index} className={`flex flex-row justify-start items-start gap-4 ${index < ((emissao.historioRastreio ?? []).length - 1) ? 'border-b' : ''} border-[#e3e4e8] dark:border-slate-600 w-full p-2`}>
                                            <div className="flex flex-col gap-1">
                                                <time dateTime={rastreio.dataCompleta} className="text-slate-500 dark:text-slate-400 text-xs font-medium">{format(parseISO(rastreio.dtHrCriado), 'dd MMM HH:mm', { locale: ptBR })}</time>

                                                <div className="flex flex-col gap-1">
                                                    <p className="text-base text-slate-800 dark:text-slate-100 font-medium text-start mb-2 leading-6">{rastreio.descricao}</p>

                                                    {rastreio?.unidade && (
                                                        <p className="text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                                            {rastreio?.unidadeDestino ? `de ` : ''}
                                                            {rastreio?.unidade.tipo}:  {`${rastreio?.unidade.endereco.cidade}, ${rastreio?.unidade.endereco.uf}`}
                                                        </p>
                                                    )}
                                                    {rastreio?.unidadeDestino && (
                                                        <p className="text-xs font-normal text-slate-400 dark:text-slate-500 text-start mb-2 leading-4">
                                                            para {rastreio?.unidadeDestino.tipo}: {`${rastreio?.unidadeDestino.endereco.cidade}, ${rastreio?.unidadeDestino.endereco.uf}`}
                                                        </p>
                                                    )}
                                                    <span className="text-red-500 text-xs font-medium">
                                                        {rastreio?.detalhes ? rastreio?.detalhes : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Content>
    )
}
export default EmissaoViewDetail;
