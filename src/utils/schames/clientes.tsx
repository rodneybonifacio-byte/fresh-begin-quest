import * as yup from "yup"
import { schameEndereco } from "./endereco"

export const schameFormCliente = yup.object().shape({
    id: yup.string(),
    nomeEmpresa: yup.string().required("O nome do cliente é obrigatório").min(3, "O nome deve ter pelo menos 3 caracteres"),
    cpfCnpj: yup.string().required("O documento do cliente é obrigatório"),
    email: yup.string().required("O e-mail do cliente é obrigatório").email("E-mail inválido"),
    nomeResponsavel: yup.string().required("O nome do responsável é obrigatório").min(3, "O nome do responsável deve ter pelo menos 3 caracteres"),
    senha: yup.string().when("id", {
        is: (id: string | undefined) => !id,
        then: (schema) => schema.required("A senha do cliente é obrigatória").min(6, "A senha deve ter pelo menos 6 caracteres"),
        otherwise: (schema) => schema.optional()
    }),
    documentoEstrangeiro: yup.string(),
    telefone: yup.string(),
    celular: yup.string().required("O telefone do cliente é obrigatório"),
    endereco: schameEndereco.required("O endereço do cliente é obrigatório"),
    configuracoes: yup.object().shape({
        incluir_valor_declarado_na_nota: yup.boolean().default(false).optional(),
        aplicar_valor_declarado: yup.boolean().optional(),
        rastreio_via_whatsapp: yup.boolean().default(false).optional(),
        fatura_via_whatsapp: yup.boolean().default(false).optional(),
        link_whatsapp: yup.string().optional(),
        horario_coleta: yup.string().nullable().optional(),
        periodo_faturamento: yup.string().nullable().required("O período de faturamento é obrigatório"),
        eventos_rastreio_habilitados_via_whatsapp: yup
            .array()
            .of(yup.string().trim())
            .when('rastreio_via_whatsapp', {
                is: true,
                then: (schema) =>
                    schema
                        .min(1, 'Selecione pelo menos um evento de rastreio para notificação via WhatsApp')
                        .typeError('Você deve selecionar ao menos um evento'),
                otherwise: (schema) => schema.optional(),
            }),

        valor_disparo_evento_rastreio_whatsapp: yup
            .string()
            .transform((value) => value?.replace(',', '.') ?? '')
            .when('rastreio_via_whatsapp', {
                is: true,
                then: (schema) =>
                    schema
                        .required('O valor do disparo é obrigatório')
                        .test(
                            'valor-maior-que-zero',
                            'O valor deve ser maior que 0,00',
                            (value) => !!value && parseFloat(value) > 0
                        ),
                otherwise: (schema) => schema.optional(),
            }),
    }),
    transportadoraConfiguracoes: yup.array().of(
        yup.object().shape({
            id: yup.string().optional(),
            transportadora: yup.string().optional(),
            transportadoraId: yup.string().optional(),
            ativo: yup.boolean().optional(),
            tipoAcrescimo: yup.string().oneOf(['VALOR', 'PERCENTUAL']).optional(),
            valorAcrescimo: yup.number().optional(),
            porcentagem: yup.number().optional(),
            alturaMaxima: yup.number().optional(),
            larguraMaxima: yup.number().optional(),
            comprimentoMaximo: yup.number().optional(),
            pesoMaximo: yup.number().optional(),
        })
    ).optional(),
})

export type FormDataCliente = yup.InferType<typeof schameFormCliente>

export const schemaCreditoCliente = yup.object().shape({
    clienteId: yup.string().required("Cliente não selecionado, selecione um cliente é obrigatório"),
    valorCredito: yup.string().required("O valor do credito é obrigatório")
})

export type FormCreditoCliente = yup.InferType<typeof schemaCreditoCliente>;