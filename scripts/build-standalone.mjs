import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "web-dist");
const indexPath = join(distDir, "index.html");
let html = readFileSync(indexPath, "utf8");

const scriptMatch = html.match(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/);

if (!scriptMatch || !styleMatch) {
  throw new Error("Could not find built script or stylesheet in dist/index.html.");
}

const script = readFileSync(join(distDir, scriptMatch[1]), "utf8").replace(/<\/script>/gi, "<\\/script>");
const style = readFileSync(join(distDir, styleMatch[1]), "utf8");
const inlineScript = `<script>\n${script}\n</script>`;

html = html
  .replace(styleMatch[0], `<style>\n${style}\n</style>`)
  .replace(scriptMatch[0], "")
  .replace("</body>", `    ${inlineScript}\n  </body>`);

writeFileSync(indexPath, html);
