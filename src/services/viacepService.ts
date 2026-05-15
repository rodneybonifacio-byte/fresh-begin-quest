import type { ViacepAddress } from "../types/viacepAddress";
import { CustomHttpClient } from "../utils/http-axios-client";
import { BaseService } from "./BaseService";

type Provider = "viacep" | "brasilapi" | "opencep";

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, timeout = TIMEOUT_MS): Promise<Response> {
	const ctrl = new AbortController();
	const id = setTimeout(() => ctrl.abort(), timeout);
	try {
		return await fetch(url, { signal: ctrl.signal });
	} finally {
		clearTimeout(id);
	}
}

function isEmpty(v?: string) {
	return !v || !v.trim();
}

function normalize(data: Partial<ViacepAddress>): ViacepAddress {
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

async function fromViaCep(cep: string): Promise<ViacepAddress | null> {
	try {
		const r = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`);
		if (!r.ok) return null;
		const d = await r.json();
		if (d?.erro) return null;
		return normalize(d);
	} catch (e) {
		console.warn("[CEP] ViaCEP falhou", e);
		return null;
	}
}

async function fromBrasilApi(cep: string): Promise<ViacepAddress | null> {
	try {
		const r = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${cep}`);
		if (!r.ok) return null;
		const d = await r.json();
		return normalize({
			cep: d.cep,
			logradouro: d.street,
			bairro: d.neighborhood,
			localidade: d.city,
			uf: d.state,
		});
	} catch (e) {
		console.warn("[CEP] BrasilAPI falhou", e);
		return null;
	}
}

async function fromOpenCep(cep: string): Promise<ViacepAddress | null> {
	try {
		const r = await fetchWithTimeout(`https://opencep.com/v1/${cep}`);
		if (!r.ok) return null;
		const d = await r.json();
		return normalize({
			cep: d.cep,
			logradouro: d.logradouro,
			bairro: d.bairro,
			localidade: d.localidade,
			uf: d.uf,
		});
	} catch (e) {
		console.warn("[CEP] OpenCEP falhou", e);
		return null;
	}
}

export class ViacepService extends BaseService<ViacepAddress> {
	protected endpoint = import.meta.env.PROD
		? "https://viacep.com.br/ws"
		: "/viacep/ws";

	constructor() {
		super(new CustomHttpClient());
	}

	async consulta(cep: string): Promise<ViacepAddress> {
		const cepLimpo = (cep || "").replace(/\D/g, "");
		if (cepLimpo.length !== 8) {
			throw new Error("CEP inválido. Informe 8 dígitos.");
		}

		// Race em paralelo: o primeiro provedor com resposta válida vence.
		const providers: Array<{ name: Provider; fn: () => Promise<ViacepAddress | null> }> = [
			{ name: "viacep", fn: () => fromViaCep(cepLimpo) },
			{ name: "brasilapi", fn: () => fromBrasilApi(cepLimpo) },
			{ name: "opencep", fn: () => fromOpenCep(cepLimpo) },
		];

		const results = await Promise.allSettled(providers.map((p) => p.fn()));
		const valid = results
			.map((r, i) => (r.status === "fulfilled" ? { name: providers[i].name, data: r.value } : null))
			.filter((x): x is { name: Provider; data: ViacepAddress } => !!x && !!x.data);

		if (valid.length === 0) {
			throw new Error("Não foi possível localizar o CEP. Verifique e tente novamente.");
		}

		// Prioriza o resultado mais completo (com logradouro/bairro), senão o primeiro.
		const completo = valid.find((v) => !isEmpty(v.data.logradouro) && !isEmpty(v.data.bairro));
		const escolhido = completo ?? valid[0];
		console.info(`[CEP] ${cepLimpo} resolvido via ${escolhido.name}`);
		return escolhido.data;
	}
}
