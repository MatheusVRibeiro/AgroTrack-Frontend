import jsPDF from "jspdf";
import type { Fazenda } from "@/types";

const toNumber = (v: number | string | null | undefined) => {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  const p = Number(v);
  return Number.isNaN(p) ? 0 : p;
};

const fmt = (n: number, dec = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// ── Drawing helpers ──────────────────────────────────────────────
function drawLine(doc: jsPDF, x1: number, y: number, x2: number, color: number[] = [226, 232, 240]) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.4);
  doc.line(x1, y, x2, y);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, accent: number[]) {
  // Accent bar
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.roundedRect(14, y - 4, 3, 12, 1, 1, "F");
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 21, y + 4);
  return y + 12;
}

function drawKpiCard(
  doc: jsPDF,
  x: number, y: number, w: number,
  label: string, value: string, sub: string,
  bgColor: number[], accentColor: number[]
) {
  // Card bg
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.roundedRect(x, y, w, 28, 3, 3, "F");
  // Top accent line
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(x, y, w, 3, 3, 3, "F");
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y + 2, w, 2, "F");
  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + w / 2, y + 10, { align: "center" });
  // Value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(value, x + w / 2, y + 19, { align: "center" });
  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(sub, x + w / 2, y + 25, { align: "center" });
}

function drawTableRow(
  doc: jsPDF,
  y: number,
  label: string, value: string,
  isAlt: boolean,
  valueColor?: number[]
) {
  if (isAlt) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y - 4, 182, 9, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(label, 18, y + 1);
  doc.setFont("helvetica", "bold");
  if (valueColor) doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
  else doc.setTextColor(30, 41, 59);
  doc.text(value, 192, y + 1, { align: "right" });
  return y + 9;
}

// ── Main export ──────────────────────────────────────────────────
export function exportarPDFFazenda(fazenda: Fazenda) {
  const doc = new jsPDF();
  const pageW = 210;

  // ═══════════════════════ HEADER ═══════════════════════
  // Dark header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 40, "F");
  // Accent gradient strip
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 40, pageW, 2, "F");

  // Logo circle
  doc.setFillColor(37, 99, 235);
  doc.circle(26, 20, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("TC", 26, 23, { align: "center" });

  // Company name
  doc.setFontSize(16);
  doc.text("Transcontelli Logística", 42, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Relatório Gerencial de Produção", 42, 24);

  // Date & status
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 196, 14, { align: "right" });

  const statusLabel = fazenda.colheita_finalizada ? "FINALIZADA" : "EM ANDAMENTO";
  const stColor = fazenda.colheita_finalizada ? [22, 163, 74] : [234, 179, 8];
  doc.setFillColor(stColor[0], stColor[1], stColor[2]);
  doc.roundedRect(162, 20, 34, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, 179, 25.5, { align: "center" });

  // Safra badge
  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(71, 85, 105);
  doc.roundedRect(162, 31, 34, 6, 1, 1, "FD");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Safra ${fazenda.safra || "-"}`, 179, 35.2, { align: "center" });

  // ═══════════════════════ IDENTIFICATION ═══════════════
  let y = 52;
  y = drawSectionTitle(doc, "Identificação da Origem", y, [37, 99, 235]);

  // Info box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 28, 3, 3, "FD");

  const infoY = y + 8;
  const col1 = 18;
  const col2 = 110;

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Fazenda", col1, infoY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fazenda.fazenda, col1 + 22, infoY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Proprietário", col2, infoY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fazenda.proprietario || "-", col2 + 26, infoY);

  const infoY2 = infoY + 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Estado", col1, infoY2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(fazenda.estado || "-", col1 + 22, infoY2);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Produto", col2, infoY2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  const produto = `${fazenda.mercadoria || "-"}${fazenda.variedade ? ` (${fazenda.variedade})` : ""}`;
  doc.text(produto, col2 + 26, infoY2);

  const infoY3 = infoY2 + 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Peso/Saca", col1, infoY3);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`${fazenda.peso_medio_saca ?? 25} kg`, col1 + 22, infoY3);

  let ultimoFreteTxt = "-";
  if (fazenda.ultimo_frete_data) {
    ultimoFreteTxt = new Date(fazenda.ultimo_frete_data).toLocaleDateString("pt-BR");
    if (fazenda.ultimo_frete_motorista) ultimoFreteTxt += ` • ${fazenda.ultimo_frete_motorista}`;
  } else if (fazenda.ultimo_frete) {
    ultimoFreteTxt = fazenda.ultimo_frete;
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Último Frete", col2, infoY3);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(ultimoFreteTxt, col2 + 26, infoY3);

  y += 35;

  // ═══════════════════════ KPI CARDS ═══════════════════
  y = drawSectionTitle(doc, "Indicadores de Volumetria", y, [99, 102, 241]);

  const cardW = 56;
  const gap = 7;
  drawKpiCard(doc, 14, y, cardW,
    "Sacas Transportadas",
    (fazenda.total_sacas_carregadas ?? 0).toLocaleString("pt-BR"),
    "unidades",
    [239, 246, 255], [37, 99, 235]
  );
  drawKpiCard(doc, 14 + cardW + gap, y, cardW,
    "Peso Total",
    fmt(toNumber(fazenda.total_toneladas), 3),
    "toneladas",
    [245, 240, 255], [124, 58, 237]
  );
  drawKpiCard(doc, 14 + (cardW + gap) * 2, y, cardW,
    "Fretes Realizados",
    (fazenda.total_fretes_realizados ?? 0).toString(),
    "viagens executadas",
    [241, 245, 249], [71, 85, 105]
  );

  y += 36;

  // ═══════════════════════ FINANCIAL DRE ═══════════════
  y = drawSectionTitle(doc, "Demonstração de Resultado (DRE)", y, [22, 163, 74]);

  const receita = toNumber(fazenda.faturamento_total);
  const custos = toNumber(fazenda.total_custos_operacionais);
  const lucro = toNumber(fazenda.lucro_liquido) || (receita - custos);
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(14, y, 182, 8, 2, 2, "F");
  doc.rect(14, y + 4, 182, 4, "F"); // square off bottom corners
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIÇÃO", 18, y + 5.5);
  doc.text("VALOR (R$)", 192, y + 5.5, { align: "right" });
  y += 10;

  y = drawTableRow(doc, y, "(+) Faturamento Líquido (Receita)", `R$ ${fmt(receita)}`, false, [22, 163, 74]);
  y = drawTableRow(doc, y, "(-) Custos Operacionais das Viagens", `R$ ${fmt(custos)}`, true, [220, 38, 38]);

  // Separator line
  drawLine(doc, 14, y - 2, 196, [203, 213, 225]);

  y = drawTableRow(doc, y, "(=) Resultado Operacional (Lucro Líquido)", `R$ ${fmt(lucro)}`, false,
    lucro >= 0 ? [22, 163, 74] : [220, 38, 38]);

  // Margin badge
  doc.setFillColor(lucro >= 0 ? 240 : 254, lucro >= 0 ? 253 : 242, lucro >= 0 ? 244 : 242);
  doc.roundedRect(140, y - 3, 56, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(lucro >= 0 ? 22 : 220, lucro >= 0 ? 163 : 38, lucro >= 0 ? 74 : 38);
  doc.text(`Margem: ${margem.toFixed(1)}%`, 168, y + 2.5, { align: "center" });

  y += 12;

  // ═══════════════════════ PRICING ═══════════════════════
  y = drawSectionTitle(doc, "Precificação e Análise por Saca", y, [234, 179, 8]);

  const precoPorSaca = ((fazenda.preco_por_tonelada ?? 0) * (fazenda.peso_medio_saca ?? 25)) / 1000;
  const lucroPorSaca = (fazenda.total_sacas_carregadas ?? 0) > 0
    ? lucro / (fazenda.total_sacas_carregadas!)
    : 0;
  const receitaPorTon = receita / (toNumber(fazenda.total_toneladas) || 1);

  // 2x2 grid of mini-cards
  const miniW = 88;
  const miniH = 16;
  const miniGap = 6;

  const drawMiniCard = (x: number, my: number, label: string, value: string, color: number[]) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, my, miniW, miniH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, my + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, x + 4, my + 13);
  };

  drawMiniCard(14, y, "Preço Base / Tonelada", `R$ ${fmt(toNumber(fazenda.preco_por_tonelada))}`, [37, 99, 235]);
  drawMiniCard(14 + miniW + miniGap, y, "Receita Média / Tonelada", `R$ ${fmt(receitaPorTon)}`, [124, 58, 237]);

  y += miniH + 4;
  drawMiniCard(14, y, "Receita Bruta / Saca", `R$ ${fmt(precoPorSaca)}`, [234, 179, 8]);
  drawMiniCard(14 + miniW + miniGap, y, "Lucro Líquido / Saca", `R$ ${fmt(lucroPorSaca)}`, [22, 163, 74]);

  y += miniH + 10;

  // ═══════════════════════ FOOTER ═══════════════════════
  // Footer separator
  doc.setFillColor(37, 99, 235);
  doc.rect(14, 278, 182, 0.8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("Transcontelli Logística e Fretes", 14, 283);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Página 1 de 1", 105, 283, { align: "center" });
  doc.text("Documento Gerencial Interno", 196, 283, { align: "right" });

  doc.setFontSize(6);
  doc.text(
    "Este relatório foi gerado automaticamente pelo sistema e contém informações confidenciais da operação.",
    105, 287, { align: "center" }
  );

  // Save
  const nomeArquivo = `DRE_Producao_Transcontelli_${fazenda.fazenda.replace(/\s+/g, "_")}.pdf`;
  doc.save(nomeArquivo);
  return nomeArquivo;
}
