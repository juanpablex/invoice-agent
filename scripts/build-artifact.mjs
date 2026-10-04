// Builds the web app for a claude.ai Artifact: in-memory router, relative asset paths, no page URL assumptions.
// Output: dist-artifact/ (artifact.html + _expo/...). Publish artifact.html as the page and _expo/** as files.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const original = pkg.main;
rmSync("dist-artifact", { recursive: true, force: true });
try {
  writeFileSync("package.json", JSON.stringify({ ...pkg, main: "src/artifact/entry.tsx" }, null, 2) + "\n");
  execFileSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-artifact", "--clear"], { stdio: "inherit", env: { ...process.env, ARTIFACT: "1" } });
} finally {
  writeFileSync("package.json", JSON.stringify({ ...pkg, main: original }, null, 2) + "\n");
}

// Artifact file paths cannot start with "_", so the bundles move from _expo/static/js/web to js/.
const from = "dist-artifact/_expo/static/js/web";
mkdirSync("dist-artifact/js", { recursive: true });
for (const f of readdirSync(from)) {
  writeFileSync(`dist-artifact/js/${f}`, readFileSync(`${from}/${f}`, "utf8").replaceAll("/_expo/static/js/web/", "js/"));
}
const entry = readdirSync("dist-artifact/js").find((f) => f.startsWith("entry-"));
writeFileSync(
  "dist-artifact/artifact.html",
  `<title>Invoice Agent</title>
<style>html,body{height:100%;margin:0;overflow:hidden}#root{display:flex;height:100%;flex:1}</style>
<div id="root"></div>
<script src="js/${entry}" defer></script>
`,
);
console.log("artifact build ready:", entry);
