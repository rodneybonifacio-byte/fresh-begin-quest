// Gerador de PDF da etiqueta Marketplace (modelo Correios SEDEX BRHUB).
// 2 páginas: (1) etiqueta com código de barras Code128, (2) Declaração de Conteúdo.
// Sem dependências nativas: usa pdf-lib + Code128 implementado localmente.

// @ts-nocheck
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
} from "https://esm.sh/pdf-lib@1.17.1";

// ─── Code128 encoder (subsets B/C automático) ───────────────────────────
const C128_PATTERNS = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11110110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110","11010000100","11010010000",
  "11010011100","1100011101011",
];
// 103 StartB, 105 StartC, 106 Stop

function code128Encode(text: string): string {
  // Heurística: se for só dígitos pares, usa C. Caso contrário B.
  // Para SRO Correios (ex: AD465405677BR) usamos B (uppercase + dígitos).
  const codes: number[] = [];
  const useC = /^\d+$/.test(text) && text.length % 2 === 0;
  let checksum: number;
  if (useC) {
    codes.push(105);
    for (let i = 0; i < text.length; i += 2) codes.push(parseInt(text.substr(i, 2), 10));
  } else {
    codes.push(104); // Start B
    for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  }
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  checksum = sum % 103;
  codes.push(checksum);
  codes.push(106);
  return codes.map((c) => C128_PATTERNS[c]).join("");
}

// ─── Helpers de layout ──────────────────────────────────────────────────
const A4 = PageSizes.A4; // [595.28, 841.89]

// WinAnsi (Helvetica) suporta acentos latinos; mantemos como está.
const sanitize = (s: any) => String(s ?? "");

function fmtCep(cep: string) {
  const d = String(cep ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0,5)}-${d.slice(5)}` : (cep ?? "");
}
function fmtCpfCnpj(v: string) {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return v ?? "";
}
function fmtMoney(n: any) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2).replace(".", ",") : String(n ?? "");
}
function formatTracking(code: string) {
  const c = String(code ?? "").toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)) {
    return `${c.slice(0,2)} ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8,11)} ${c.slice(11)}`;
  }
  return c;
}

export interface LabelInput {
  trackingCode: string;
  serviceName?: string;
  serviceCode?: string;
  contract?: string;
  orderId?: string;
  volume?: string; // "1/1"
  weight?: string; // kg
  dimensions?: string; // "20x20x30"
  sender: {
    name: string; cpfCnpj?: string; address?: string; neighborhood?: string;
    cityState?: string; cep?: string; phone?: string;
  };
  recipient: {
    name: string; cpfCnpj?: string; address?: string; neighborhood?: string;
    cityState?: string; cep?: string; phone?: string;
  };
  items?: Array<{ descricao: string; quantidade: number; valor: number }>;
}

// ────────────────────────────────────────────────────────────────────────
export async function buildMarketplaceLabelPdf(input: LabelInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  // ═══════════════════════════ PÁGINA 1 — ETIQUETA ═════════════════════════
  const p1 = doc.addPage(A4);
  const W = A4[0], H = A4[1];
  const M = 28; // margem
  let y = H - M;

  const black = rgb(0, 0, 0);
  const drawText = (t: string, x: number, yy: number, size = 9, bold = false) =>
    p1.drawText(sanitize(t), { x, y: yy, size, font: bold ? fontB : font, color: black });
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.7) =>
    p1.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w, color: black });
  const rect = (x: number, yy: number, w: number, h: number, lw = 0.7) =>
    p1.drawRectangle({ x, y: yy, width: w, height: h, borderColor: black, borderWidth: lw });

  // Header: Correios + Contrato/Serviço/Volume
  drawText("Correios", M, y - 18, 22, true);
  drawText(`Contrato: ${input.contract ?? ""}`, W - M - 230, y - 10, 8);
  drawText(input.serviceName || "BRHUB SEDEX", W - M - 230, y - 22, 11, true);
  drawText(`Volume: ${input.volume || "1/1"}`, W - M - 230, y - 34, 9);
  y -= 50;
  line(M, y, W - M, y);

  // Bloco código de barras
  const tracking = input.trackingCode;
  const pattern = code128Encode(tracking);
  const barH = 70;
  const totalW = W - 2 * M;
  const moduleW = totalW / pattern.length;
  const barY = y - barH - 10;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      p1.drawRectangle({
        x: M + i * moduleW, y: barY, width: moduleW, height: barH, color: black,
      });
    }
  }
  // Texto do tracking sob o barcode (centralizado)
  const trackTxt = formatTracking(tracking);
  const tw = fontB.widthOfTextAtSize(trackTxt, 18);
  drawText(trackTxt, (W - tw) / 2, barY - 22, 18, true);
  y = barY - 36;
  line(M, y, W - M, y);

  // Linha de info: Peso | Pedido | Dim
  y -= 18;
  drawText(`Peso: ${input.weight ?? "-"} kg`, M, y, 10, true);
  drawText(`Pedido: ${input.orderId ?? "-"}`, M + 170, y, 10, true);
  drawText(`Dim: ${input.dimensions ?? "-"}cm`, M + 380, y, 10, true);
  y -= 10;
  line(M, y, W - M, y);

  // Boxes Recebedor / Assinatura / Documento
  y -= 60;
  const colW = (W - 2 * M) / 3;
  rect(M, y, colW, 60);
  rect(M + colW, y, colW, 60);
  rect(M + 2 * colW, y, colW, 60);
  drawText("Recebedor:", M + 4, y + 50, 8);
  drawText("Assinatura:", M + colW + 4, y + 50, 8);
  drawText("Documento:", M + 2 * colW + 4, y + 50, 8);
  y -= 12;

  // DESTINATÁRIO
  y -= 12;
  drawText("DESTINATÁRIO", M, y, 11, true);
  y -= 16;
  drawText(input.recipient.name || "", M, y, 12, true);
  y -= 14;
  drawText(`CPF/CNPJ: ${fmtCpfCnpj(input.recipient.cpfCnpj || "")}`, M, y, 9);
  y -= 14;
  const recAddr = [input.recipient.address, input.recipient.neighborhood].filter(Boolean).join(" - ");
  drawText(recAddr, M, y, 10);
  y -= 14;
  if (input.recipient.phone) {
    drawText(`Tel: ${input.recipient.phone}`, M, y, 10);
    y -= 14;
  }
  drawText(`${fmtCep(input.recipient.cep || "")} ${input.recipient.cityState || ""}`, M, y, 11, true);
  y -= 18;
  line(M, y, W - M, y);

  // REMETENTE
  y -= 14;
  drawText(`REMETENTE: ${input.sender.name || ""}`, M, y, 10, true);
  y -= 13;
  drawText(`CPF/CNPJ: ${fmtCpfCnpj(input.sender.cpfCnpj || "")}`, M, y, 9);
  y -= 13;
  const sAddr = [input.sender.address, input.sender.neighborhood].filter(Boolean).join(" - ");
  drawText(sAddr, M, y, 9);
  y -= 13;
  drawText(`${fmtCep(input.sender.cep || "")} ${input.sender.cityState || ""}`, M, y, 9);

  // ═══════════════════════════ PÁGINA 2 — DECLARAÇÃO ════════════════════════
  const p2 = doc.addPage(A4);
  const dT = (t: string, x: number, yy: number, size = 9, bold = false) =>
    p2.drawText(sanitize(t), { x, y: yy, size, font: bold ? fontB : font, color: black });
  const dRect = (x: number, yy: number, w: number, h: number, lw = 0.7) =>
    p2.drawRectangle({ x, y: yy, width: w, height: h, borderColor: black, borderWidth: lw });
  const dLine = (x1: number, y1: number, x2: number, y2: number, w = 0.7) =>
    p2.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w, color: black });

  let yy = H - M;

  // Título
  const title = "DECLARAÇÃO DE CONTEÚDO";
  const titleW = fontB.widthOfTextAtSize(title, 16);
  dT(title, (W - titleW) / 2, yy - 16, 16, true);
  yy -= 36;

  // Seção: REMETENTE | DESTINATÁRIO
  const sectionH = 110;
  const halfW = (W - 2 * M) / 2;
  dRect(M, yy - sectionH, halfW, sectionH);
  dRect(M + halfW, yy - sectionH, halfW, sectionH);

  const drawPessoa = (x: number, p: LabelInput["sender"]) => {
    let py = yy - 14;
    dT("Nome: ", x + 4, py, 8, true); dT(p.name || "", x + 32, py, 8);
    py -= 12;
    const addr = [p.address, p.neighborhood].filter(Boolean).join(" - ");
    dT("Endereço: ", x + 4, py, 8, true); dT(addr, x + 50, py, 8);
    py -= 12;
    const [cidade, uf] = String(p.cityState || "").split("/");
    dT("Cidade: ", x + 4, py, 8, true); dT(cidade || "", x + 38, py, 8);
    dT("UF: ", x + 140, py, 8, true); dT(uf || "", x + 158, py, 8);
    py -= 12;
    dT("CEP: ", x + 4, py, 8, true); dT(fmtCep(p.cep || ""), x + 28, py, 8);
    py -= 12;
    dT("CPF/CNPJ: ", x + 4, py, 8, true); dT(fmtCpfCnpj(p.cpfCnpj || ""), x + 52, py, 8);
    if (p.phone) {
      py -= 12;
      dT("Telefone: ", x + 4, py, 8, true); dT(p.phone, x + 46, py, 8);
    }
  };
  // Header das colunas
  dT("REMETENTE", M + 6, yy - 4, 9, true);
  dT("DESTINATÁRIO", M + halfW + 6, yy - 4, 9, true);
  drawPessoa(M, input.sender);
  drawPessoa(M + halfW, input.recipient as any);
  yy -= sectionH + 18;

  // IDENTIFICAÇÃO DOS BENS — tabela
  dT("IDENTIFICAÇÃO DOS BENS", M, yy, 11, true);
  yy -= 14;
  const cols = [
    { label: "ITEM", w: 50 },
    { label: "CONTEÚDO", w: W - 2 * M - 50 - 80 - 90 },
    { label: "QUANT.", w: 80 },
    { label: "VALOR (R$)", w: 90 },
  ];
  const rowH = 18;
  // Header da tabela
  let cx = M;
  dRect(M, yy - rowH, W - 2 * M, rowH);
  for (const c of cols) {
    dT(c.label, cx + 4, yy - 13, 9, true);
    cx += c.w;
    if (cx < W - M) dLine(cx, yy - rowH, cx, yy);
  }
  yy -= rowH;

  const items = input.items || [];
  let totalValor = 0;
  items.forEach((it, idx) => {
    dRect(M, yy - rowH, W - 2 * M, rowH);
    let xx = M;
    dT(String(idx + 1), xx + 4, yy - 13, 9); xx += cols[0].w; dLine(xx, yy - rowH, xx, yy);
    dT(it.descricao || "Mercadoria", xx + 4, yy - 13, 9); xx += cols[1].w; dLine(xx, yy - rowH, xx, yy);
    dT(String(it.quantidade ?? 1), xx + 4, yy - 13, 9); xx += cols[2].w; dLine(xx, yy - rowH, xx, yy);
    dT(fmtMoney(it.valor), xx + 4, yy - 13, 9);
    totalValor += Number(it.valor || 0);
    yy -= rowH;
  });

  // Linha TOTAIS
  dRect(M, yy - rowH, W - 2 * M, rowH);
  dT("TOTAIS", M + cols[0].w + cols[1].w + 4, yy - 13, 9, true);
  dT(fmtMoney(totalValor), M + cols[0].w + cols[1].w + cols[2].w + 4, yy - 13, 9, true);
  yy -= rowH;

  // PESO TOTAL
  dRect(M, yy - rowH, W - 2 * M, rowH);
  dT("PESO TOTAL (KG)", M + cols[0].w + cols[1].w + 4, yy - 13, 9, true);
  dT(String(input.weight ?? "-"), M + cols[0].w + cols[1].w + cols[2].w + 4, yy - 13, 9, true);
  yy -= rowH + 20;

  // DECLARAÇÃO — texto
  dT("DECLARAÇÃO", M, yy, 11, true);
  yy -= 14;
  const paragrafos = [
    "Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e a quem de direito, por informações inverídicas.",
    "Declaro que não envio objeto que ponha em risco o transporte aéreo, nem objeto proibido no fluxo postal, assumindo responsabilidade pela informação prestada, e ciente de que o descumprimento pode configurar crime, conforme artigo 261 do Código Penal Brasileiro. Declaro, ainda, estar ciente da lista de proibições e restrições, disponível no site dos Correios: correios.com.br/enviar/proibicoes-e-restricoes.",
  ];
  const wrap = (text: string, size: number, maxW: number) => {
    const words = text.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxW) {
        if (cur) out.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
    return out;
  };
  for (const par of paragrafos) {
    const lines = wrap(par, 9, W - 2 * M);
    for (const ln of lines) {
      dT(ln, M, yy, 9);
      yy -= 11;
    }
    yy -= 6;
  }

  // Linha de data + assinatura
  yy -= 16;
  dT("_______________________, ____ de __________________ de ___________", M, yy, 9);
  yy -= 24;
  const sigW = 200;
  dLine((W - sigW) / 2, yy, (W + sigW) / 2, yy);
  yy -= 12;
  const sigLbl = "Assinatura do Declarante/Remetente";
  const sw = font.widthOfTextAtSize(sigLbl, 9);
  dT(sigLbl, (W - sw) / 2, yy, 9);
  yy -= 24;
  dT("OBSERVAÇÃO: ", M, yy, 8, true);
  dT(
    "Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social e qualquer acessório (Lei 8.137/90 Art. 1º, V).",
    M + 70, yy, 8,
  );

  return await doc.save();
}

// Helper para Uint8Array → base64 em Deno
export function uint8ToBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as any);
  }
  return btoa(bin);
}
