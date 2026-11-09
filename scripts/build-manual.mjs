// Genera el PDF del manual de uso a partir de docs/MANUAL-DE-USO.md.
// Uso: pnpm manual:pdf   →   docs/Manual-de-uso-JH-Inversiones.pdf
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const source = readFileSync(path.join(docs, "MANUAL-DE-USO.md"), "utf8");
const output = path.join(docs, "Manual-de-uso-JH-Inversiones.pdf");

// El título (# …) y la primera línea de introducción van en la portada.
const intro = source.split("\n").find(l => l && !l.startsWith("#")) || "";
const markdown = source.split("\n").filter(l => !l.startsWith("# ") && l !== intro && l !== "---").join("\n");
const sections = [];
const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth, text }) {
  const label = this.parser.parseInline(tokens);
  if (depth !== 2) return `<h${depth}>${label}</h${depth}>`;
  const match = /^(\d+)\.\s+(.*)$/.exec(text);
  const id = `s${match ? match[1] : sections.length + 1}`;
  sections.push({ id, number: match?.[1] ?? "", title: match ? match[2] : text });
  return `<h2 id="${id}">${match ? `<span class="num">${match[1]}</span>${marked.parseInline(match[2])}` : label}</h2>`;
};
// Las capturas de celular (verticales) se muestran más pequeñas.
renderer.image = ({ href, text }) =>
  `<figure${/movil/.test(href) ? ' class="phone"' : ""}><img src="${pathToFileURL(path.join(docs, href)).href}" alt="${text}"><figcaption>${text}</figcaption></figure>`;
renderer.blockquote = function ({ tokens }) { return `<aside class="note">${this.parser.parse(tokens)}</aside>`; };
const body = marked.parse(markdown, { renderer });
const date = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" }).format(new Date());

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Julius+Sans+One&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap">
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  @page :first { margin: 0; }
  :root { --ink:#131a35; --strong:#070e46; --muted:#5b6585; --line:#e3e8f2; --accent:#1748c4; --soft:#f3f6fd; --gold:#ffd34f; --note:#fff8e1; --noteline:#f0cf63; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { margin: 0; color: var(--ink); font: 400 10.5pt/1.55 "Source Sans 3", "Source Sans Pro", "Segoe UI", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover { height: 297mm; padding: 34mm 22mm 24mm; display: flex; flex-direction: column; break-after: page; border-top: 10mm solid var(--strong); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark { width: 46px; height: 46px; border-radius: 12px; background: linear-gradient(135deg,#ffd34f,#ffb72b); color: var(--strong); display: grid; place-items: center; font: 700 18px "Julius Sans One", sans-serif; }
  .brand span { font: 700 9pt "Source Sans 3", sans-serif; letter-spacing: .24em; text-transform: uppercase; color: var(--muted); }
  .cover h1 { font: 400 40pt/1.05 "Julius Sans One", "Century Gothic", sans-serif; letter-spacing: .03em; text-transform: uppercase; color: var(--strong); margin: 46mm 0 8mm; }
  .cover h1 em { font-style: normal; color: var(--accent); }
  .cover .lede { font-size: 14pt; color: var(--muted); max-width: 120mm; margin: 0; }
  .facts { display: flex; flex-wrap: wrap; gap: 8px; margin: 14mm 0 0; padding: 0; list-style: none; }
  .facts li { border: 1px solid var(--line); border-radius: 999px; padding: 5px 14px; font-weight: 600; font-size: 10pt; color: var(--strong); background: var(--soft); }
  .cover .meta { margin-top: auto; display: flex; justify-content: space-between; color: var(--muted); font-size: 10pt; border-top: 1px solid var(--line); padding-top: 5mm; }
  .toc { break-after: page; }
  .toc h2 { margin-top: 0; }
  .toc ol { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 12mm; }
  .toc li { break-inside: avoid; padding: 6px 0; border-bottom: 1px solid var(--line); display: flex; gap: 10px; font-size: 11pt; }
  .toc .n { color: var(--accent); font-weight: 800; min-width: 20px; font-variant-numeric: tabular-nums; }
  .toc a { color: var(--ink); text-decoration: none; }
  h2 { font: 400 19pt/1.2 "Julius Sans One", "Century Gothic", sans-serif; letter-spacing: .03em; text-transform: uppercase; color: var(--strong); margin: 0 0 5mm; padding-bottom: 3mm; border-bottom: 2px solid var(--gold); display: flex; gap: 10px; align-items: baseline; break-after: avoid; }
  main h2 { break-before: page; }
  main h2:first-of-type { break-before: auto; }
  h2 .num { font: 800 12pt "Source Sans 3", sans-serif; color: var(--strong); background: var(--gold); border-radius: 6px; padding: 1px 8px; letter-spacing: 0; transform: translateY(-2px); }
  h3 { font: 700 12.5pt "Source Sans 3", sans-serif; color: var(--strong); margin: 6mm 0 2mm; break-after: avoid; }
  p { margin: 0 0 3mm; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin: 1.2mm 0; }
  strong { color: var(--strong); }
  code { font: 600 9.5pt ui-monospace, Menlo, Consolas, monospace; background: var(--soft); border-radius: 4px; padding: 0 4px; color: var(--strong); }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 10pt; break-inside: avoid; }
  th { text-align: left; background: var(--soft); color: var(--muted); font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; padding: 6px 9px; border-bottom: 1px solid var(--line); }
  td { padding: 6px 9px; border-bottom: 1px solid var(--line); vertical-align: top; }
  figure { margin: 3mm 0 6mm; break-inside: avoid; text-align: center; }
  figure img { max-width: 100%; max-height: 175mm; border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 2px 8px rgba(10,20,70,.08); }
  figure.phone img { max-height: 110mm; }
  figcaption { font-size: 8.5pt; color: var(--muted); margin-top: 2mm; }
  .note { background: var(--note); border: 1px solid var(--noteline); border-radius: 8px; padding: 3mm 4mm; margin: 3mm 0 5mm; break-inside: avoid; }
  .note p { margin: 0; }
</style></head><body>
<section class="cover">
  <div class="brand"><div class="mark">JH</div><span>JH Inversiones · Administración</span></div>
  <h1>Manual de <em>uso</em></h1>
  <p class="lede">${intro}</p>
  <ul class="facts"><li>Inversión desde 50 USD</li><li>Plazo mínimo de 30 días</li><li>Ganancia diaria (1.5 % por defecto)</li><li>Todo en dólares (USD)</li></ul>
  <div class="meta"><span>Panel de administración</span><span>Versión ${date}</span></div>
</section>
<section class="toc"><h2>Contenido</h2><ol>${sections.map(s => `<li><span class="n">${s.number}</span><a href="#${s.id}">${s.title}</a></li>`).join("")}</ol></section>
<main>${body}</main>
</body></html>`;

const tmp = path.join(docs, ".manual-tmp.html");
writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: output, format: "A4", printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font:8px Arial,sans-serif;color:#7b84a3;padding:0 16mm;display:flex;justify-content:space-between"><span>JH Inversiones · Manual de uso</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
});
await browser.close();
const { unlinkSync } = await import("node:fs");
unlinkSync(tmp);
console.log(`PDF generado: ${path.relative(root, output)}`);
