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

    // 🛡️ Diff real entre baseline (estado carregado do backend) e o valor submetido.
    // Só inclui no payload os campos que de fato MUDARAM. Independe de dirtyFields
    // (que é pouco confiável porque várias abas usam setValue sem shouldDirty:true).
    const isPlainObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);

    const deepEqual = (a: any, b: any): boolean => {
        if (a === b) return true;
        if (a == null || b == null) return a == b; // trata null/undefined como equivalentes
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((v, i) => deepEqual(v, b[i]));
        }
        if (isPlainObject(a) && isPlainObject(b)) {
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            for (const k of keys) if (!deepEqual(a[k], b[k])) return false;
            return true;
        }
        return false;
    };

    const buildDiffPayload = (baseline: any, data: any): any => {
        const result: any = { ...(baseline ?? {}) };
        if (!isPlainObject(data)) return result;
        for (const key of Object.keys(data)) {
            const baseVal = baseline?.[key];
            const newVal = data[key];
            if (deepEqual(baseVal, newVal)) continue;
            // Para objetos aninhados (ex: configuracoes), faz merge profundo do que mudou
            if (isPlainObject(baseVal) && isPlainObject(newVal)) {
                result[key] = buildDiffPayload(baseVal, newVal);
            } else {
                // Arrays e primitivos: substitui inteiro pelo novo valor
                result[key] = newVal;
            }
        }
        return result;
    };

    const mutation = useMutation({
        mutationFn: async (data: FormDataCliente) => {
            setIsLoading(true);

            // CREATE
            if (!data.id) {
                const requestData: any = { ...data, criadoEm: new Date().toISOString() };
                const senhaTrim = typeof requestData.senha === 'string' ? requestData.senha.trim() : '';
                requestData.senha = senhaTrim;
                return service.create(requestData);
            }

            // UPDATE: parte do baseline do backend e sobrepõe SÓ o que de fato mudou
            const baseline = cliente?.data ?? {};
            const requestData: any = buildDiffPayload(baseline, data);

            // Garante identificação e nunca sobrescreve criadoEm em edições
            requestData.id = data.id;
            delete requestData.criadoEm;

            // 🔒 GUARDRAIL senha: nunca enviar vazia em edição (sobrescreveria a senha do cliente)
            const senhaTrim = typeof requestData.senha === 'string' ? requestData.senha.trim() : '';
            if (!senhaTrim) {
                delete requestData.senha;
            } else {
                requestData.senha = senhaTrim;
            }

            return service.update(data.id, requestData);
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