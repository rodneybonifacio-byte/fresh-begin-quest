// Gerador de PDF da etiqueta Marketplace (modelo Correios SEDEX BRHUB).
// Formato 10x15cm (283.46 x 425.2 pts). 2 páginas: (1) etiqueta com Code128,
// (2) Declaração de Conteúdo. Sem dependências nativas (pdf-lib + Code128 local).

// @ts-nocheck
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

// ─── Code128 encoder ────────────────────────────────────────────────────
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

function code128Encode(text: string): string {
  const codes: number[] = [];
  const useC = /^\d+$/.test(text) && text.length % 2 === 0;
  if (useC) {
    codes.push(105);
    for (let i = 0; i < text.length; i += 2) codes.push(parseInt(text.substr(i, 2), 10));
  } else {
    codes.push(104);
    for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  }
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103);
  codes.push(106);
  return codes.map((c) => C128_PATTERNS[c]).join("");
}

// ─── Helpers ────────────────────────────────────────────────────────────
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
  volume?: string;
  weight?: string;
  dimensions?: string;
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

// 10 x 15 cm em pontos (1cm = 28.3465pt)
const LABEL_W = 283.46;
const LABEL_H = 425.20;

// ────────────────────────────────────────────────────────────────────────
export async function buildMarketplaceLabelPdf(input: LabelInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.55, 0.55, 0.55);

  const wrap = (text: string, size: number, maxW: number, f = font) => {
    const words = String(text || "").split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxW) {
        if (cur) out.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) out.push(cur);
    return out;
  };

  // ═══════════════════════════ PÁGINA 1 — ETIQUETA 10x15 ════════════════════
  const p1 = doc.addPage([LABEL_W, LABEL_H]);
  const W = LABEL_W, H = LABEL_H;
  const M = 8; // margem interna

  const T = (page, t: string, x: number, y: number, size = 7, bold = false, color = black) =>
    page.drawText(sanitize(t), { x, y, size, font: bold ? fontB : font, color });
  const L = (page, x1: number, y1: number, x2: number, y2: number, w = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w, color: black });
  const R = (page, x: number, y: number, w: number, h: number, lw = 0.5) =>
    page.drawRectangle({ x, y, width: w, height: h, borderColor: black, borderWidth: lw });

  // Borda externa
  R(p1, M, M, W - 2 * M, H - 2 * M, 0.8);

  let y = H - M;

  // ── Header: Correios (centralizado, sem logo gráfico) ────────────
  const headerH = 36;
  const correios = "Correios";
  const cw = fontB.widthOfTextAtSize(correios, 18);
  T(p1, correios, (W - cw) / 2, y - 24, 18, true);
  y -= headerH;
  L(p1, M, y, W - M, y, 0.8);

  // ── Linha Contrato | Serviço | Volume ────────────────────────────
  const lineH = 14;
  const contratoRaw = input.contract || "";
  const contratoTxt = `Contrato: ${contratoRaw}`;
  T(p1, contratoTxt, M + 4, y - 10, 5.2, true);
  const svc = input.serviceName || "BRHUB SEDEX";
  const svcW = fontB.widthOfTextAtSize(svc, 8);
  T(p1, svc, (W - svcW) / 2 + 30, y - 10, 8, true);
  const vol = `Volume: ${input.volume || "1/1"}`;
  const volW = fontB.widthOfTextAtSize(vol, 6);
  T(p1, vol, W - M - 4 - volW, y - 10, 6, true);
  y -= lineH;
  L(p1, M, y, W - M, y);

  // ── Tracking code (grande) ───────────────────────────────────────
  const trackTxt = formatTracking(input.trackingCode);
  let trackSize = 16;
  while (fontB.widthOfTextAtSize(trackTxt, trackSize) > W - 2 * M - 8 && trackSize > 9) trackSize -= 0.5;
  const trackW = fontB.widthOfTextAtSize(trackTxt, trackSize);
  T(p1, trackTxt, (W - trackW) / 2, y - trackSize - 3, trackSize, true);
  y -= trackSize + 8;
  L(p1, M, y, W - M, y);

  // ── Code128 ──────────────────────────────────────────────────────
  const pattern = code128Encode(input.trackingCode);
  const barH = 50;
  const usableW = W - 2 * M - 8;
  const moduleW = usableW / pattern.length;
  const barX = M + 4;
  const barY = y - barH - 4;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      p1.drawRectangle({
        x: barX + i * moduleW, y: barY, width: moduleW, height: barH, color: black,
      });
    }
  }
  y = barY - 4;
  L(p1, M, y, W - M, y);

  // ── Peso | Pedido | Dim ──────────────────────────────────────────
  const infoH = 14;
  T(p1, "Peso: ", M + 4, y - 10, 6.5, true);
  T(p1, `${input.weight ?? "-"} kg`, M + 4 + fontB.widthOfTextAtSize("Peso: ", 6.5), y - 10, 6.5);
  const pedX = M + 78;
  T(p1, "Pedido: ", pedX, y - 10, 6.5, true);
  T(p1, sanitize(input.orderId ?? "-"), pedX + fontB.widthOfTextAtSize("Pedido: ", 6.5), y - 10, 6.5);
  const dimLbl = "Dim: ";
  const dimVal = `${input.dimensions ?? "-"}cm`;
  const dimTotalW = fontB.widthOfTextAtSize(dimLbl, 6.5) + font.widthOfTextAtSize(dimVal, 6.5);
  const dimX = W - M - 4 - dimTotalW;
  T(p1, dimLbl, dimX, y - 10, 6.5, true);
  T(p1, dimVal, dimX + fontB.widthOfTextAtSize(dimLbl, 6.5), y - 10, 6.5);
  y -= infoH;
  L(p1, M, y, W - M, y);

  // ── Recebedor / Assinatura / Documento (3 linhas empilhadas) ────
  const recH = 42;
  const lineGap = recH / 3;
  ["Recebedor:", "Assinatura:", "Documento:"].forEach((lbl, i) => {
    const ly = y - lineGap * (i + 1) + 4;
    T(p1, lbl, M + 4, ly, 6.5);
    const lblW = font.widthOfTextAtSize(lbl, 6.5);
    L(p1, M + 4 + lblW + 4, ly - 2, W - M - 4, ly - 2, 0.4);
  });
  y -= recH;
  L(p1, M, y, W - M, y);

  // ── DESTINATÁRIO ─────────────────────────────────────────────────
  y -= 14;
  T(p1, "DESTINATÁRIO", M + 4, y, 10, true, gray);
  y -= 14;
  // Nome
  const nameSize = 11;
  T(p1, input.recipient.name || "", M + 4, y, nameSize, true);
  y -= 11;
  T(p1, `CPF/CNPJ: ${fmtCpfCnpj(input.recipient.cpfCnpj || "")}`, M + 4, y, 7);
  y -= 10;
  const recAddrLines = wrap(input.recipient.address || "", 7.5, W - 2 * M - 8);
  for (const ln of recAddrLines.slice(0, 2)) {
    T(p1, ln, M + 4, y, 7.5);
    y -= 9;
  }
  if (input.recipient.neighborhood) {
    T(p1, input.recipient.neighborhood, M + 4, y, 7.5);
    y -= 9;
  }
  if (input.recipient.phone) {
    T(p1, `Tel: ${input.recipient.phone}`, M + 4, y, 7.5);
    y -= 9;
  }
  y -= 2;
  const cepCity = `${fmtCep(input.recipient.cep || "")} ${input.recipient.cityState || ""}`;
  T(p1, cepCity, M + 4, y, 10, true);
  y -= 12;

  // CEP barcode pequeno
  const cepDigits = String(input.recipient.cep || "").replace(/\D/g, "");
  if (cepDigits.length === 8) {
    const cepPattern = code128Encode(cepDigits);
    const cepBarH = 26;
    const cepBarW = Math.min(140, W - 2 * M - 8);
    const cepModW = cepBarW / cepPattern.length;
    const cepX = M + 4;
    const cepY = y - cepBarH - 2;
    for (let i = 0; i < cepPattern.length; i++) {
      if (cepPattern[i] === "1") {
        p1.drawRectangle({
          x: cepX + i * cepModW, y: cepY, width: cepModW, height: cepBarH, color: black,
        });
      }
    }
    y = cepY - 4;
  }

  // ── Separador tracejado ──────────────────────────────────────────
  const dashY = y - 2;
  const dashLen = 3;
  for (let x = M; x < W - M; x += dashLen * 2) {
    L(p1, x, dashY, Math.min(x + dashLen, W - M), dashY, 0.6);
  }
  y = dashY - 6;

  // ── REMETENTE ────────────────────────────────────────────────────
  T(p1, `REMETENTE: ${input.sender.name || ""}`, M + 4, y, 8, true);
  y -= 9;
  T(p1, `CPF/CNPJ: ${fmtCpfCnpj(input.sender.cpfCnpj || "")}`, M + 4, y, 6.5);
  y -= 9;
  const sAddrLines = wrap(
    [input.sender.address, input.sender.neighborhood].filter(Boolean).join(" - "),
    6.5, W - 2 * M - 8
  );
  for (const ln of sAddrLines.slice(0, 2)) {
    T(p1, ln, M + 4, y, 6.5);
    y -= 8;
  }
  T(p1, `${fmtCep(input.sender.cep || "")} ${input.sender.cityState || ""}`, M + 4, y, 7, true);

  // ═══════════════════════════ PÁGINA 2 — DECLARAÇÃO 10x15 ═════════════════
  const p2 = doc.addPage([LABEL_W, LABEL_H]);
  R(p2, M, M, W - 2 * M, H - 2 * M, 0.8);
  let yy = H - M;

  // Título
  const title = "DECLARAÇÃO DE CONTEÚDO";
  const titleW = fontB.widthOfTextAtSize(title, 12);
  T(p2, title, (W - titleW) / 2, yy - 14, 12, true);
  yy -= 22;
  L(p2, M, yy, W - M, yy, 0.8);

  // Cabeçalho REMETENTE | DESTINATÁRIO
  const colHdrH = 12;
  const colW = (W - 2 * M) / 2;
  const remLbl = "REMETENTE", destLbl = "DESTINATÁRIO";
  T(p2, remLbl, M + (colW - fontB.widthOfTextAtSize(remLbl, 8)) / 2, yy - 9, 8, true);
  T(p2, destLbl, M + colW + (colW - fontB.widthOfTextAtSize(destLbl, 8)) / 2, yy - 9, 8, true);
  yy -= colHdrH;
  L(p2, M, yy, W - M, yy, 0.5);
  L(p2, M + colW, yy + colHdrH, M + colW, yy, 0.5);

  // Bloco pessoa
  const pessoaH = 68;
  const drawPessoa = (x: number, p: LabelInput["sender"]) => {
    let py = yy - 9;
    const wMax = colW - 6;
    T(p2, "Nome: ", x + 3, py, 5.5, true);
    T(p2, p.name || "", x + 3 + fontB.widthOfTextAtSize("Nome: ", 5.5), py, 5.5);
    py -= 9;
    const addr = [p.address, p.neighborhood].filter(Boolean).join(" - ");
    T(p2, "Endereço: ", x + 3, py, 5.5, true);
    const addrLines = wrap(addr, 5.5, wMax - fontB.widthOfTextAtSize("Endereço: ", 5.5));
    let firstY = py;
    addrLines.slice(0, 2).forEach((ln, i) => {
      T(p2, ln, x + 3 + (i === 0 ? fontB.widthOfTextAtSize("Endereço: ", 5.5) : 0), firstY - i * 8, 5.5);
    });
    py -= 8 * Math.min(addrLines.length, 2);
    const [cidade, uf] = String(p.cityState || "").split("/");
    T(p2, "Cidade: ", x + 3, py, 5.5, true);
    T(p2, cidade || "", x + 3 + fontB.widthOfTextAtSize("Cidade: ", 5.5), py, 5.5);
    T(p2, "UF: ", x + colW - 30, py, 5.5, true);
    T(p2, uf || "", x + colW - 30 + fontB.widthOfTextAtSize("UF: ", 5.5), py, 5.5);
    py -= 9;
    T(p2, "CEP: ", x + 3, py, 5.5, true);
    T(p2, fmtCep(p.cep || ""), x + 3 + fontB.widthOfTextAtSize("CEP: ", 5.5), py, 5.5);
    py -= 9;
    T(p2, "CPF/CNPJ: ", x + 3, py, 5.5, true);
    T(p2, fmtCpfCnpj(p.cpfCnpj || ""), x + 3 + fontB.widthOfTextAtSize("CPF/CNPJ: ", 5.5), py, 5.5);
  };
  drawPessoa(M, input.sender);
  drawPessoa(M + colW, input.recipient as any);
  yy -= pessoaH;
  L(p2, M, yy, W - M, yy, 0.5);

  // IDENTIFICAÇÃO DOS BENS
  const bensTitle = "IDENTIFICAÇÃO DOS BENS";
  const btW = fontB.widthOfTextAtSize(bensTitle, 9);
  T(p2, bensTitle, (W - btW) / 2, yy - 10, 9, true);
  yy -= 14;
  L(p2, M, yy, W - M, yy, 0.5);

  // Tabela
  const cols = [
    { label: "ITEM", w: 32 },
    { label: "CONTEÚDO", w: W - 2 * M - 32 - 50 - 50 },
    { label: "QUANT.", w: 50 },
    { label: "VALOR", w: 50 },
  ];
  const rowH = 12;
  // Header
  let cx = M;
  for (const c of cols) {
    T(p2, c.label, cx + 3, yy - 9, 6.5, true);
    cx += c.w;
    if (cx < W - M) L(p2, cx, yy - rowH, cx, yy, 0.4);
  }
  yy -= rowH;
  L(p2, M, yy, W - M, yy, 0.4);

  // Rows
  const items = input.items || [];
  let totalValor = 0;
  items.forEach((it, idx) => {
    let xx = M;
    T(p2, String(idx + 1), xx + 3, yy - 9, 6.5);
    xx += cols[0].w; L(p2, xx, yy - rowH, xx, yy, 0.4);
    T(p2, it.descricao || "Mercadoria", xx + 3, yy - 9, 6.5);
    xx += cols[1].w; L(p2, xx, yy - rowH, xx, yy, 0.4);
    T(p2, String(it.quantidade ?? 1), xx + 3, yy - 9, 6.5);
    xx += cols[2].w; L(p2, xx, yy - rowH, xx, yy, 0.4);
    T(p2, fmtMoney(it.valor), xx + 3, yy - 9, 6.5);
    totalValor += Number(it.valor || 0);
    yy -= rowH;
    L(p2, M, yy, W - M, yy, 0.3);
  });

  // TOTAIS
  const totLbl = "TOTAIS";
  T(p2, totLbl, M + cols[0].w + cols[1].w + cols[2].w - fontB.widthOfTextAtSize(totLbl, 6.5) - 3, yy - 9, 6.5, true);
  T(p2, fmtMoney(totalValor), M + cols[0].w + cols[1].w + cols[2].w + 3, yy - 9, 6.5, true);
  yy -= rowH;
  L(p2, M, yy, W - M, yy, 0.4);

  // PESO
  const pesoLbl = "PESO TOTAL (KG)";
  T(p2, pesoLbl, M + cols[0].w + cols[1].w + cols[2].w - fontB.widthOfTextAtSize(pesoLbl, 6.5) - 3, yy - 9, 6.5, true);
  T(p2, String(input.weight ?? "-"), M + cols[0].w + cols[1].w + cols[2].w + 3, yy - 9, 6.5);
  yy -= rowH;
  L(p2, M, yy, W - M, yy, 0.5);

  // DECLARAÇÃO
  yy -= 4;
  const decTitle = "DECLARAÇÃO";
  const dtW = fontB.widthOfTextAtSize(decTitle, 9);
  T(p2, decTitle, (W - dtW) / 2, yy - 8, 9, true);
  yy -= 14;
  const paragrafos = [
    "Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, responsabilizando-me, nos termos da lei, por informações inverídicas.",
    "Declaro que não envio objeto que ponha em risco o transporte aéreo, nem objeto proibido no fluxo postal, ciente de que o descumprimento pode configurar crime, conforme artigo 261 do Código Penal Brasileiro.",
  ];
  for (const par of paragrafos) {
    const lines = wrap(par, 5.5, W - 2 * M - 8);
    for (const ln of lines) {
      T(p2, ln, M + 4, yy, 5.5);
      yy -= 7;
    }
    yy -= 3;
  }

  yy -= 4;
  T(p2, "_______________, ____ de ___________ de ______", M + 4, yy, 6);
  yy -= 12;
  const sigW = 120;
  L(p2, (W - sigW) / 2, yy, (W + sigW) / 2, yy, 0.5);
  yy -= 8;
  const sigLbl = "Assinatura do Declarante/Remetente";
  T(p2, sigLbl, (W - font.widthOfTextAtSize(sigLbl, 6)) / 2, yy, 6);
  yy -= 12;
  T(p2, "OBSERVAÇÃO: ", M + 4, yy, 5.5, true);
  const obsLines = wrap(
    "Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social (Lei 8.137/90 Art. 1º, V).",
    5.5, W - 2 * M - 8 - fontB.widthOfTextAtSize("OBSERVAÇÃO: ", 5.5)
  );
  obsLines.forEach((ln, i) => {
    T(p2, ln, M + 4 + (i === 0 ? fontB.widthOfTextAtSize("OBSERVAÇÃO: ", 5.5) : 0), yy - i * 7, 5.5);
  });

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
