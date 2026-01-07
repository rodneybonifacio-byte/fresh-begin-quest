import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ManifestoPdfHeaderData = {
  clienteNome: string;
  clienteCnpj: string;
  enderecoLinha: string;
  manifestoId?: string;
  dataHora?: string;
  totalObjetos: number;
  totalSedex: number;
  totalPac: number;
};

const normalizeBase64 = (input: string): string => {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  const commaIdx = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && commaIdx !== -1) return trimmed.slice(commaIdx + 1);
  return trimmed;
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const wrapText = (text: string, maxChars: number): string[] => {
  const t = text.trim();
  if (t.length <= maxChars) return [t];

  const words = t.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = w;
  }
  if (current) lines.push(current);

  return lines;
};

/**
 * Corrige o cabeçalho do PDF de manifesto (gerado externamente) para exibir os dados do remetente selecionado.
 */
export const patchManifestoPdfHeader = async (
  originalBase64: string,
  header: ManifestoPdfHeaderData
): Promise<string> => {
  const base64 = normalizeBase64(originalBase64);
  if (!base64) return originalBase64;

  try {
    const srcBytes = base64ToUint8Array(base64);
    const pdfDoc = await PDFDocument.load(srcBytes);

    const page = pdfDoc.getPages()[0];
    if (!page) return originalBase64;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageW = page.getWidth();
    const pageH = page.getHeight();

    // Caixa do cabeçalho (aprox. do modelo atual)
    const boxX = 20;
    const boxY = pageH - 120; // margem superior
    const boxW = pageW - 40;
    const boxH = 95;

    // Limpa cabeçalho antigo
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const leftX = boxX + 14;
    const topY = boxY + boxH - 22;
    const lineH = 14;

    const clienteLine = `Cliente: ${header.clienteNome}`;
    const cnpjLine = `CNPJ: ${header.clienteCnpj}`;

    const enderecoPrefix = "Endereço: ";
    const enderecoLines = wrapText(`${enderecoPrefix}${header.enderecoLinha}`, 70);

    const manifestoLine = header.manifestoId ? `Nº Manifesto: ${header.manifestoId}` : "";
    const dataHoraLine = header.dataHora ? `Data/Hora: ${header.dataHora}` : "";

    let y = topY;

    page.drawText(clienteLine, { x: leftX, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= lineH;

    page.drawText(cnpjLine, { x: leftX, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= lineH;

    for (const [idx, l] of enderecoLines.entries()) {
      page.drawText(l, {
        x: leftX,
        y,
        size: 12,
        font: idx === 0 ? fontBold : font,
        color: rgb(0, 0, 0),
      });
      y -= lineH;
      if (y < boxY + 10) break;
    }

    if (manifestoLine) {
      page.drawText(manifestoLine, { x: leftX, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      y -= lineH;
    }

    if (dataHoraLine) {
      page.drawText(dataHoraLine, { x: leftX, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    }

    // Totais à direita
    const rightLines = [
      `Total de Objetos: ${header.totalObjetos}`,
      `Total SEDEX: ${header.totalSedex}`,
      `Total PAC: ${header.totalPac}`,
    ];

    const rightTopY = topY;
    const rightPadding = 14;

    rightLines.forEach((t, idx) => {
      const size = 12;
      const w = fontBold.widthOfTextAtSize(t, size);
      page.drawText(t, {
        x: boxX + boxW - rightPadding - w,
        y: rightTopY - idx * lineH,
        size,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    });

    const outBytes = await pdfDoc.save();
    return uint8ArrayToBase64(outBytes);
  } catch (e) {
    console.error("❌ Erro ao corrigir cabeçalho do manifesto:", e);
    return originalBase64;
  }
};
