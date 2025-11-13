import * as yup from "yup"

export const schemaFaturaConfirmaPagamento = yup.object().shape({
    id: yup.string().required("ID da fatura é obrigatório"),
    valorPago: yup.string().required("Valor pago é obrigatório"),
    dataPagamento: yup.string().required("Data do pagamento é obrigatório"),
    arquivos: yup.array().of(yup.mixed()).optional(),
    observacao: yup.string().optional(),
});

export type FormFaturaConfirmaPagamento = yup.InferType<typeof schemaFaturaConfirmaPagamento>