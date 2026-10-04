// Post-processes the web export: blocks browser auto-translation (it breaks React apps) and adds the SPA fallback page.
import { readFileSync, writeFileSync } from "node:fs";

let html = readFileSync("dist/index.html", "utf8");
if (!html.includes('translate="no"')) html = html.replace(/<html([^>]*)>/, '<html$1 translate="no">');
if (!html.includes('name="google"')) html = html.replace("</head>", '<meta name="google" content="notranslate"></head>');
writeFileSync("dist/index.html", html);
writeFileSync("dist/404.html", html);
console.log("web export post-processed");
