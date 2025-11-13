import * as yup from "yup"

export const schemaCorreiosAporte = yup.object().shape({
    idCredencial: yup.string().required("Contrato do correios não selecionado, selecione um contrato é obrigatório"),
    valorAporte: yup.string().required("O valor do aporte é obrigatório")
})

export type FormCorreiosAporte = yup.InferType<typeof schemaCorreiosAporte>;