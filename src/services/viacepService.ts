import type { ViacepAddress } from "../types/viacepAddress";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

export class ViacepService extends BaseService<ViacepAddress> {
	protected endpoint = import.meta.env.PROD
		? "https://viacep.com.br/ws"
		: "/viacep/ws";

	constructor() {
		super(new CustomHttpClient());
	}

	async consulta(cep: string): Promise<ViacepAddress> {
		const cepLimpo = cep.replace(/\D/g, "");
		
		// Tentar primeiro com ViaCEP (mais estável)
		try {
			const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
			const data = await response.json();
			
			if (!data.erro) {
				return {
					cep: data.cep || "",
					logradouro: data.logradouro || "",
					bairro: data.bairro || "",
					localidade: data.localidade || "",
					uf: data.uf || "",
					ibge: data.ibge || "",
					gia: data.gia || "",
					ddd: data.ddd || "",
					siafi: data.siafi || "",
					complemento: data.complemento || "",
				};
			}
		} catch (error) {
			console.warn("ViaCEP falhou, tentando BrasilAPI...", error);
		}

		// Fallback para BrasilAPI
		try {
			const response = await this.httpClient.get<any>(
				`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`
			);
			return {
				cep: response.cep || "",
				logradouro: response.street || "",
				bairro: response.neighborhood || "",
				localidade: response.city || "",
				uf: response.state || "",
				ibge: "",
				gia: "",
				ddd: "",
				siafi: "",
				complemento: "",
			};
		} catch (error) {
			console.error("Erro ao consultar o CEP em todas as APIs:", error);
			throw new Error("CEP não encontrado. Verifique se o CEP está correto.");
		}
	}
}
