import * as yup from "yup"

export const schameEndereco = yup.object().shape({
    cep: yup.string().required("Informe o cep"),
    logradouro: yup.string().required("Informe o logradouro"),
    numero: yup.string().required("Informe o numero"),
    complemento: yup.string(),
    bairro: yup.string().required("Informe o bairro"),
    localidade: yup.string().required("Informe a cidade"),
    uf: yup.string().required("Informe o estado")
});