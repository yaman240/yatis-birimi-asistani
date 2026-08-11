import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createExplicitFirestoreRuntime, createLocalRepositoryRuntime } from "../guest-physician/repository-runtime.js";

test("UI doğrudan veri SDK çağrısı veya SDK importu içermez", async () => {
  const source = await readFile(new URL("../guest-physician/guest-physician-app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["']firebase/);
  assert.doesNotMatch(source, /\b(?:getDoc|setDoc|updateDoc|deleteDoc|runTransaction|collection|doc)\s*\(/);
  assert.match(source, /createLocalRepositoryRuntime/);
  assert.match(source, /CaseWorkflow/);
});

test("varsayılan runtime local/mock ve bellek içidir", async () => {
  const runtime = await createLocalRepositoryRuntime();
  assert.equal(runtime.mode, "local");
  assert.equal(typeof runtime.localDebug.list, "function");
});

test("uzak bağlantı açık izin olmadan oluşturulamaz", () => {
  assert.throws(() => createExplicitFirestoreRuntime({ projectId: "demo-safe" }), /açık etkinleştirme/);
});

test("canlı görünümlü proje kimliği açık izin verilse de reddedilir", () => {
  assert.throws(() => createExplicitFirestoreRuntime({
    explicitlyEnableFirestore: true,
    projectId: "yatis-birimi-production"
  }), /demo- veya staging-/);
});

test("ortam seçimi Local/Mock varsayılanı ve görünür Staging bilgisi taşır", async () => {
  const html = await readFile(new URL("../guest-physician/index.html", import.meta.url), "utf8");
  const source = await readFile(new URL("../guest-physician/guest-physician-app.js", import.meta.url), "utf8");
  assert.match(html, /<option value="local" selected>Local \/ Mock<\/option>/);
  assert.match(html, /<option value="staging">Staging<\/option>/);
  assert.match(html, /demo-yatis-birimi-asistani/);
  assert.match(html, /127\.0\.0\.1:8080/);
  assert.match(source, /environmentModeElement\.value === "staging"/);
  assert.match(source, /import\("\.\/firebase-emulator-runtime\.js"\)/);
});
