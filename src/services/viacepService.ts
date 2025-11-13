import type { ViacepAddress } from "../types/viacepAddress";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class ViacepService extends BaseService<ViacepAddress> {
	protected endpoint = import.meta.env.PROD
		? "https://viacep.com.br/viacep/ws"
		: "/viacep/ws";

	constructor() {
		super(new CustomHttpClient()); // Passa o httpClient para a classe pai (BaseService)
	}
	async consulta(cep: any): Promise<ViacepAddress> {
		//`https://viacep.com.br/viacep/ws/${cep}/json/`
		try {
			const response = await this.httpClient.get<any>(
				`https://brasilapi.com.br/api/cep/v1/${cep}`
			);
			return {
				cep: response.cep,
				logradouro: response.street,
				bairro: response.neighborhood,
				localidade: response.city,
				uf: response.state,
				ibge: "",
				gia: "",
				ddd: "",
				siafi: "",
				complemento: "",
			};
		} catch (error) {
			console.error("Erro ao consultar o CEP:", error);
			throw error;
		}
	}
}
