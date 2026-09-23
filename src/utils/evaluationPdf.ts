import type { ClinicalFactOut, Evaluation, PersistedInferenceResult } from "../types/evaluation";
import type { Patient } from "../types/patient";
import { formatCondition, resolveFactDisplayName, type FactCatalog } from "./factLabel";

type PdfExportInput = {
  evaluation: Evaluation;
  patient: Patient;
  results: PersistedInferenceResult[];
  factCatalog?: FactCatalog;
};

type PdfColor = [number, number, number];

type KeyValue = {
  label: string;
  value: string;
};

type PdfBlock =
  | { type: "hero"; title: string; subtitle: string; meta: string; risk: string }
  | { type: "section"; title: string }
  | { type: "kv"; items: KeyValue[] }
  | { type: "factList"; emptyText: string; items: string[]; title: string; tone: "green" | "violet" | "slate" }
  | { type: "result"; index: number; result: PersistedInferenceResult; ruleConditions: string[] }
  | { type: "paragraph"; text: string };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 42;
const MARGIN_TOP = 38;
const MARGIN_BOTTOM = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const LINE_HEIGHT = 13;

const COLORS = {
  navy: [23, 37, 84] as PdfColor,
  violet: [70, 53, 211] as PdfColor,
  violetDark: [48, 38, 166] as PdfColor,
  violetSoft: [245, 243, 255] as PdfColor,
  slate: [71, 85, 105] as PdfColor,
  slateDark: [30, 41, 59] as PdfColor,
  slateLight: [248, 250, 252] as PdfColor,
  border: [226, 232, 240] as PdfColor,
  white: [255, 255, 255] as PdfColor,
  blueSoft: [239, 246, 255] as PdfColor,
  blue: [37, 99, 235] as PdfColor,
  greenSoft: [236, 253, 245] as PdfColor,
  green: [4, 120, 87] as PdfColor,
  amberSoft: [255, 251, 235] as PdfColor,
  amber: [180, 83, 9] as PdfColor,
  redSoft: [254, 242, 242] as PdfColor,
  red: [185, 28, 28] as PdfColor,
};

function normalizeText(value: unknown) {
  return String(value ?? "Sin registrar")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value?: string | null) {
  if (!value) return "Sin registrar";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function probabilityLabel(probability?: number | null) {
  return probability == null ? "No disponible" : `${(probability * 100).toFixed(1)}%`;
}

function ownerName(patient: Patient) {
  return [patient.owner.first_name, patient.owner.last_name].filter(Boolean).join(" ") || "Sin propietario";
}

function factLine(fact: ClinicalFactOut, catalog: FactCatalog = []) {
  return `${resolveFactDisplayName(fact.fact_key, catalog)}: ${String(fact.value)}`;
}

function splitFacts(facts: ClinicalFactOut[] = []) {
  return {
    symptoms: facts.filter((fact) => fact.source_type === "symptom"),
    variables: facts.filter((fact) => fact.source_type !== "symptom"),
  };
}

function conditionsLabel(value: unknown, catalog: FactCatalog = []) {
  if (Array.isArray(value)) return value.map((condition) => formatCondition(String(condition), catalog)).join("; ");
  return value ? String(value) : "Condiciones registradas";
}

function riskPalette(riskLevel?: string | null) {
  const risk = riskLevel?.toLowerCase() ?? "";

  if (risk.includes("alto")) return { background: COLORS.redSoft, foreground: COLORS.red, label: "Riesgo alto" };
  if (risk.includes("moder")) return { background: COLORS.amberSoft, foreground: COLORS.amber, label: "Riesgo moderado" };
  return { background: COLORS.greenSoft, foreground: COLORS.green, label: "Riesgo bajo" };
}

function primaryResult(results: PersistedInferenceResult[]) {
  return [...results].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1) || b.score - a.score)[0] ?? null;
}

function wrapLine(text: string, maxLength: number) {
  const words = normalizeText(text).split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    if (current) lines.push(current);
    current = word.length > maxLength ? word.slice(0, maxLength) : word;
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function escapePdfText(text: string) {
  return normalizeText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function colorCommand(color: PdfColor, operator: "rg" | "RG") {
  return `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${operator}`;
}

function rect(x: number, y: number, width: number, height: number, color: PdfColor, stroke?: PdfColor) {
  const pdfY = PAGE_HEIGHT - y - height;
  const fill = `q ${colorCommand(color, "rg")} ${x} ${pdfY} ${width} ${height} re f Q`;
  const border = stroke ? `\nq ${colorCommand(stroke, "RG")} 0.8 w ${x} ${pdfY} ${width} ${height} re S Q` : "";
  return `${fill}${border}`;
}

function text(value: string, x: number, y: number, size: number, color: PdfColor, font: "F1" | "F2" = "F1") {
  const pdfY = PAGE_HEIGHT - y;
  return `BT ${colorCommand(color, "rg")} /${font} ${size} Tf ${x} ${pdfY} Td (${escapePdfText(value)}) Tj ET`;
}

function blockHeight(block: PdfBlock) {
  if (block.type === "hero") return 116;
  if (block.type === "section") return 34;
  if (block.type === "kv") return Math.ceil(block.items.length / 2) * 42 + 24;
  if (block.type === "paragraph") return wrapLine(block.text, 92).length * LINE_HEIGHT + 26;
  if (block.type === "factList") {
    const rows = Math.max(1, block.items.length);
    return 42 + rows * 23;
  }

  const explanationLines = wrapLine(block.result.explanation ?? "Sin explicacion registrada.", 88).length;
  const rulesHeight = Math.max(1, block.result.activated_rules.length) * 50;
  return 120 + explanationLines * LINE_HEIGHT + rulesHeight;
}

function drawPageChrome(commands: string[], pageNumber: number) {
  commands.push(rect(0, 0, PAGE_WIDTH, 8, COLORS.violet));
  commands.push(rect(0, PAGE_HEIGHT - 24, PAGE_WIDTH, 24, COLORS.slateLight));
  commands.push(text("OE3 - Reporte clinico trazable", MARGIN_X, PAGE_HEIGHT - 10, 8, COLORS.slate));
  commands.push(text(`Pagina ${pageNumber}`, PAGE_WIDTH - MARGIN_X - 46, PAGE_HEIGHT - 10, 8, COLORS.slate));
}

function drawWrappedText(commands: string[], value: string, x: number, y: number, maxChars: number, size: number, color: PdfColor, font: "F1" | "F2" = "F1") {
  const lines = wrapLine(value, maxChars);
  lines.forEach((line, index) => commands.push(text(line, x, y + index * LINE_HEIGHT, size, color, font)));
  return y + lines.length * LINE_HEIGHT;
}

function drawBlock(commands: string[], block: PdfBlock, y: number) {
  if (block.type === "hero") {
    const palette = riskPalette(block.risk);
    commands.push(rect(MARGIN_X, y, CONTENT_WIDTH, 96, COLORS.navy));
    commands.push(rect(MARGIN_X + 18, y + 18, 42, 42, COLORS.violet));
    commands.push(text("OE3", MARGIN_X + 27, y + 45, 13, COLORS.white, "F2"));
    commands.push(text(block.title, MARGIN_X + 76, y + 33, 20, COLORS.white, "F2"));
    commands.push(text(block.subtitle, MARGIN_X + 76, y + 54, 10, COLORS.white));
    commands.push(text(block.meta, MARGIN_X + 76, y + 73, 9, COLORS.border));
    commands.push(rect(PAGE_WIDTH - MARGIN_X - 126, y + 30, 96, 28, palette.background));
    commands.push(text(palette.label, PAGE_WIDTH - MARGIN_X - 112, y + 49, 9, palette.foreground, "F2"));
    return y + 116;
  }

  if (block.type === "section") {
    commands.push(text(block.title, MARGIN_X, y + 20, 13, COLORS.navy, "F2"));
    commands.push(rect(MARGIN_X, y + 27, 72, 2, COLORS.violet));
    return y + 34;
  }

  if (block.type === "kv") {
    const height = blockHeight(block) - 10;
    commands.push(rect(MARGIN_X, y, CONTENT_WIDTH, height, COLORS.white, COLORS.border));
    block.items.forEach((item, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN_X + 18 + column * (CONTENT_WIDTH / 2);
      const rowY = y + 24 + row * 42;
      commands.push(text(item.label.toUpperCase(), x, rowY, 7, COLORS.slate, "F2"));
      drawWrappedText(commands, item.value, x, rowY + 15, 38, 10, COLORS.slateDark, "F2");
    });
    return y + blockHeight(block);
  }

  if (block.type === "factList") {
    const tone = block.tone === "green" ? { background: COLORS.greenSoft, text: COLORS.green } : block.tone === "violet" ? { background: COLORS.violetSoft, text: COLORS.violetDark } : { background: COLORS.slateLight, text: COLORS.slateDark };
    const items = block.items.length ? block.items : [block.emptyText];
    commands.push(rect(MARGIN_X, y, CONTENT_WIDTH, blockHeight(block) - 10, COLORS.white, COLORS.border));
    commands.push(text(block.title, MARGIN_X + 16, y + 23, 11, COLORS.navy, "F2"));
    items.forEach((item, index) => {
      const itemY = y + 38 + index * 23;
      commands.push(rect(MARGIN_X + 16, itemY - 11, CONTENT_WIDTH - 32, 18, tone.background));
      commands.push(text(item, MARGIN_X + 25, itemY + 2, 8, tone.text, "F2"));
    });
    return y + blockHeight(block);
  }

  if (block.type === "result") {
    const palette = riskPalette(block.result.risk_level);
    const cardHeight = blockHeight(block) - 10;
    commands.push(rect(MARGIN_X, y, CONTENT_WIDTH, cardHeight, COLORS.white, COLORS.border));
    commands.push(rect(MARGIN_X, y, 5, cardHeight, palette.foreground));
    commands.push(text(`${block.index}. ${block.result.suggested_diagnosis}`, MARGIN_X + 18, y + 24, 12, COLORS.navy, "F2"));
    commands.push(rect(PAGE_WIDTH - MARGIN_X - 118, y + 11, 92, 23, palette.background));
    commands.push(text(palette.label, PAGE_WIDTH - MARGIN_X - 105, y + 27, 8, palette.foreground, "F2"));
    commands.push(text(`Probabilidad: ${probabilityLabel(block.result.probability)}`, MARGIN_X + 18, y + 46, 9, COLORS.slateDark, "F2"));
    commands.push(text(`Puntaje: ${block.result.score}`, MARGIN_X + 190, y + 46, 9, COLORS.slate));
    commands.push(text("Metodo: Reglas clinicas y calculo de probabilidad", MARGIN_X + 290, y + 46, 9, COLORS.slate));
    const afterExplanation = drawWrappedText(commands, block.result.explanation ?? "Sin explicacion registrada.", MARGIN_X + 18, y + 68, 88, 9, COLORS.slate);
    commands.push(text("Reglas activadas", MARGIN_X + 18, afterExplanation + 12, 10, COLORS.navy, "F2"));

    const rules = block.result.activated_rules.length ? block.result.activated_rules : [];
    if (!rules.length) {
      commands.push(text("Sin reglas activadas asociadas.", MARGIN_X + 24, afterExplanation + 31, 9, COLORS.slate));
      return y + blockHeight(block);
    }

    rules.forEach((rule, index) => {
      const ruleY = afterExplanation + 29 + index * 50;
      commands.push(rect(MARGIN_X + 18, ruleY - 12, CONTENT_WIDTH - 36, 42, COLORS.slateLight));
      commands.push(text(rule.rule_code ?? `Regla #${rule.rule_id}`, MARGIN_X + 28, ruleY + 2, 9, COLORS.violetDark, "F2"));
      commands.push(text(`Condiciones: ${block.ruleConditions[index] ?? conditionsLabel(rule.fulfilled_conditions)}`, MARGIN_X + 28, ruleY + 17, 8, COLORS.slate));
      drawWrappedText(commands, `Justificacion: ${rule.justification || "Regla activada por condiciones cumplidas."}`, MARGIN_X + 28, ruleY + 31, 82, 8, COLORS.slate);
    });

    return y + blockHeight(block);
  }

  commands.push(rect(MARGIN_X, y, CONTENT_WIDTH, blockHeight(block) - 10, COLORS.blueSoft, COLORS.border));
  drawWrappedText(commands, block.text, MARGIN_X + 16, y + 23, 90, 9, COLORS.blue);
  return y + blockHeight(block);
}

function buildBlocks({ evaluation, patient, results, factCatalog = [] }: PdfExportInput) {
  const facts = splitFacts(evaluation.facts ?? []);
  const mainResult = primaryResult(results);

  return [
    {
      type: "hero",
      title: "Reporte de evaluacion clinica",
      subtitle: mainResult?.suggested_diagnosis ?? "Evaluacion sin resultado principal",
      meta: `Exportado: ${formatDate(new Date().toISOString())} | Evaluacion #${evaluation.id}`,
      risk: mainResult?.risk_level ?? "Bajo",
    },
    { type: "section", title: "Datos del paciente" },
    {
      type: "kv",
      items: [
        { label: "Paciente", value: patient.name },
        { label: "Propietario", value: ownerName(patient) },
        { label: "Especie", value: patient.species.name },
        { label: "Raza", value: patient.breed?.name ?? "Sin raza" },
        { label: "Sexo", value: patient.sex || "Sin registrar" },
        { label: "Peso", value: patient.weight ? `${patient.weight} kg` : "Sin registrar" },
      ],
    },
    { type: "section", title: "Resumen del diagnostico" },
    {
      type: "kv",
      items: [
        { label: "Nivel de riesgo", value: mainResult?.risk_level ?? "Sin resultado" },
        { label: "Probabilidad", value: probabilityLabel(mainResult?.probability) },
        { label: "Metodo", value: "Reglas clinicas y calculo de probabilidad" },
        { label: "Fecha evaluacion", value: formatDate(evaluation.created_at) },
        { label: "Motivo", value: evaluation.reason ?? "Sin registrar" },
        { label: "Observaciones", value: evaluation.observations ?? "Sin registrar" },
      ],
    },
    { type: "section", title: "Sintomas y variables" },
    {
      type: "factList",
      title: "Sintomas observados",
      items: facts.symptoms.map((fact) => factLine(fact, factCatalog)),
      emptyText: "Sin sintomas registrados.",
      tone: "green",
    },
    {
      type: "factList",
      title: "Variables clinicas",
      items: facts.variables.map((fact) => factLine(fact, factCatalog)),
      emptyText: "Sin variables registradas.",
      tone: "violet",
    },
    { type: "section", title: "Resultados y reglas activadas" },
    ...(results.length
      ? results.map((result, index) => ({
          type: "result" as const,
          index: index + 1,
          result,
          ruleConditions: result.activated_rules.map((rule) => conditionsLabel(rule.fulfilled_conditions, factCatalog)),
        }))
      : [{ type: "paragraph" as const, text: "Sin resultados guardados para esta evaluacion." }]),
    {
      type: "paragraph",
      text: "Conclusion: el reporte consolida la trazabilidad entre los datos del paciente, los sintomas y variables clinicas registradas, y las reglas activadas. La salida documenta evidencia clinica y no reemplaza el juicio profesional veterinario.",
    },
  ] satisfies PdfBlock[];
}

function renderPages(blocks: PdfBlock[]) {
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = MARGIN_TOP;

  function startPage() {
    commands = [];
    pages.push(commands);
    drawPageChrome(commands, pages.length);
    y = MARGIN_TOP + 16;
  }

  startPage();

  blocks.forEach((block) => {
    const height = blockHeight(block);
    if (y + height > PAGE_HEIGHT - MARGIN_BOTTOM) startPage();
    y = drawBlock(commands, block, y);
  });

  return pages;
}

function createPdfBlob(blocks: PdfBlock[]) {
  const pages = renderPages(blocks);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((pageCommands) => {
    const contentObjectId = objects.length + 2;
    const pageObjectId = objects.length + 1;
    pageObjectIds.push(pageObjectId);

    const textCommands = pageCommands.join("\n");
    const content = `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objects.push(content);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const bodyParts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(bodyParts.join("").length);
    bodyParts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = bodyParts.join("").length;
  bodyParts.push(`xref\n0 ${objects.length + 1}\n`);
  bodyParts.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    bodyParts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  bodyParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(bodyParts, { type: "application/pdf" });
}

export function downloadEvaluationPdf(input: PdfExportInput) {
  const patientName = normalizeText(input.patient.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "paciente";
  const blob = createPdfBlob(buildBlocks(input));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `evaluacion-clinica-${input.evaluation.id}-${patientName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}