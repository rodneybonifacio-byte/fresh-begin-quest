import { Content } from "../../Content";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsContent } from "@radix-ui/react-tabs";
import { Divider } from "../../../../components/divider";
import { ButtonComponent } from "../../../../components/button";
import { LoadSpinner } from "../../../../components/loading";
import { NotFoundData } from "../../../../components/NotFoundData";

import { ClienteService } from "../../../../services/ClienteService";
import { useFetchQuery } from "../../../../hooks/useFetchQuery";
import { useAddress } from "../../../../hooks/useAddress";
import { useLoadingSpinner } from "../../../../providers/LoadingSpinnerContext";

import { schameFormCliente, type FormDataCliente } from "../../../../utils/schames/clientes";

import { DadosCliente } from "./tabs/DadosCliente";
import { DadosAcesso } from "./tabs/DadosAcesso";
import { ConfiguracoesCliente } from "./tabs/ConfiguracoesCliente";
import { Transportadora } from "./tabs/Transportadora";

import { toast } from "sonner";
import { TabItem } from "./tabs/TabItem";

const FormularioCliente = () => {
    const { setIsLoading } = useLoadingSpinner();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { clienteId } = useParams();
    const { onBuscaCep } = useAddress();
    const service = new ClienteService();
    const [tab, setTab] = useState("dadosCliente");

    const { data: cliente, isLoading, isError } = useFetchQuery(
        ["cliente", clienteId],
        async () => await service.getById(clienteId ?? ""),
        { enabled: !!clienteId, retry: false }
    );

    const methods = useForm<FormDataCliente>({
        resolver: yupResolver(schameFormCliente),
        defaultValues: {} as FormDataCliente,
    });

    const { handleSubmit, reset, formState: { errors } } = methods;

    const mutation = useMutation({
        mutationFn: async (data: FormDataCliente) => {
            setIsLoading(true);
            const requestData = { ...data, criadoEm: new Date().toISOString() };
            if (data.id) return service.update(data.id, requestData);
            return service.create(requestData);
        },
        onSuccess: () => {
            setIsLoading(false);
            // Invalida a lista de clientes
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            // Invalida a query específica do cliente editado
            if (clienteId) {
                queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
            }
            toast.success("Cliente salvo com sucesso!", { duration: 4000 });
            navigate("/admin/clientes");
        },
        onError: (error) => {
            setIsLoading(false);
            console.error(error);
        }
    });

    const onSubmit = async (data: FormDataCliente) => {
          console.log(methods.formState.errors);
        try {
            await mutation.mutateAsync(data);
        } catch (error) {
            console.error('Erro ao enviar dados:', error);
        }
    };

    const validateBeforeSubmit = () => {
        if (errors.nomeEmpresa || errors.cpfCnpj || errors.telefone || errors.celular || errors.endereco) {
            setTab("dadosCliente");
            return;
        }
        if (errors.email || errors.senha) {
            setTab("dadosAcesso");
            return;
        }
        if (errors.transportadoraConfiguracoes) {
            console.log('Erro na aba transportadora:', errors.transportadoraConfiguracoes);
            setTab("transportadora");
            return;
        }
        if (errors.configuracoes) {
            setTab("configuracoes");
            return;
        }
        
        handleSubmit(onSubmit)();
    };

    useEffect(() => {
        if (cliente?.data) {
            reset(cliente.data);
        }
    }, [cliente]);

    if (isError) return <NotFoundData />;

    return (
        <Content isToBack titulo={`${clienteId ? "Editar" : "Novo"} Cliente`}>
            {isLoading ? <LoadSpinner mensagem="Carregando cliente..." /> : (
                <FormProvider {...methods}>
                    <form className="flex flex-col gap-6">
                        <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col gap-4">
                            <TabsList className="flex gap-4 bg-white dark:bg-slate-800 w-full p-4 rounded-xl border border-input dark:border-slate-600">
                                <TabItem
                                    value="dadosCliente"
                                    label="Dados do Cliente"
                                    hasError={!!(errors.nomeEmpresa || errors.cpfCnpj || errors.telefone || errors.celular || errors.endereco)}
                                />
                                <TabItem
                                    value="dadosAcesso"
                                    label="Dados de Acesso"
                                    hasError={!!(errors.email || errors.senha)}
                                />
                                <TabItem
                                    value="transportadora"
                                    label="Transportadora"
                                    hasError={!!errors.transportadoraConfiguracoes}
                                />
                                <TabItem
                                    value="configuracoes"
                                    label="Configurações"
                                    hasError={!!errors.configuracoes}
                                />
                            </TabsList>
                            <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-800 w-full rounded-lg border dark:border-slate-600">

                                <TabsContent value="dadosCliente">
                                    <DadosCliente onBuscaCep={(cep) => onBuscaCep(cep, setIsLoading)} />
                                </TabsContent>

                                <TabsContent value="dadosAcesso">
                                    <DadosAcesso />
                                </TabsContent>

                                <TabsContent value="transportadora">
                                    <Transportadora />
                                </TabsContent>

                                <TabsContent value="configuracoes">
                                    <ConfiguracoesCliente />
                                </TabsContent>
                            </div>
                        </Tabs>

                        <Divider />

                        <div className="flex justify-end gap-4">
                            <ButtonComponent type="button" onClick={validateBeforeSubmit}>
                                Salvar
                            </ButtonComponent>
                            <ButtonComponent type="button" border="outline" onClick={() => reset()}>
                                Cancelar
                            </ButtonComponent>
                        </div>
                    </form>
                </FormProvider>
            )
            }
        </Content >
    );
};

export default FormularioCliente;