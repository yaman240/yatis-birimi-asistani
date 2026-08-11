import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("ana içerik, arama ve navigasyon orta kontrastlı çerçevelere sahiptir", async () => {
  const css = await read("style.css");
  assert.match(css, /--frame-silver:#aeb2b5/);
  assert.match(css, /\.box\{border:1px solid var\(--frame-silver\)/);
  assert.match(css, /\.content-box\{border-color:#969ba0\}/);
  assert.match(css, /\.filters\{padding:14px;border:1px solid #aeb2b5/);
  assert.match(css, /\.nav-item\.active[\s\S]*var\(--matte-gold\)/);
});

test("branş başlıkları ve işlem kartları birbirinden görünür ayırıcılarla ayrılır", async () => {
  const css = await read("style.css");
  assert.match(css, /\.group-title[\s\S]*border-top:1px solid var\(--frame-anthracite\)/);
  assert.match(css, /\.group-title[\s\S]*border-bottom:1px solid var\(--divider-silver\)/);
  assert.match(css, /\.card\{border:1px solid #a9aeb2/);
  assert.match(css, /\.card-top[\s\S]*border-bottom:1px solid #c5c8ca/);
  assert.match(css, /\.prices[\s\S]*border-bottom:1px solid #c8cbcd/);
});

test("yönetim ve gömülü modül çalışma alanları bağımsız güçlü sınırlara sahiptir", async () => {
  const css = await read("style.css");
  assert.match(css, /#adminPanel\{border-color:#747a7f/);
  assert.match(css, /#adminPanel \.grid[\s\S]*border:1px solid #b8bcc0/);
  assert.match(css, /\.backup-panel\{border-top:1px solid #8f9599/);
  assert.match(css, /\.guest-module-frame\{border:1px solid #9ba0a4/);
});

test("Misafir Hekim form ve finans grupları masaüstü ve mobilde görünür sınırları korur", async () => {
  const css = await read("guest-physician/guest-physician.css");
  assert.match(css, /border-color: #b5b4af/);
  assert.match(css, /\.form-section legend[\s\S]*border-bottom: 1px solid #b9b8b3/);
  assert.match(css, /\.commission-section[\s\S]*border-color: #aaa9a5/);
  assert.match(css, /\.breakdown-row[\s\S]*border-bottom-color: #b9b8b3/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*border-color:#9f9e99/);
});
