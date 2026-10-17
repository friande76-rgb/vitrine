// Procura segredos no código que é enviado ao browser.
//
// Um segredo só é secreto enquanto fica no servidor. Basta um import errado
// para a chave da Meshy ou a chave secreta do Supabase acabarem dentro de um
// ficheiro .js que qualquer visitante descarrega. Este teste corre depois do
// build e falha se isso acontecer.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIR = ".next/static";
const SECRET_VARS = ["SUPABASE_SECRET_KEY", "MESHY_API_KEY"];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const values = SECRET_VARS.map((name) => [name, process.env[name]]).filter(
  ([, value]) => typeof value === "string" && value.length >= 8,
);

const files = walk(CLIENT_DIR);
const problems = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [name, value] of values) {
    if (value && text.includes(value)) problems.push(`${file}: contém o valor de ${name}`);
  }
  // O nome da variável no código do cliente também é suspeito: só lá chega se
  // alguém importou um módulo de servidor para um componente de browser.
  for (const name of SECRET_VARS) {
    if (text.includes(`process.env.${name}`)) problems.push(`${file}: lê process.env.${name}`);
  }
}

if (problems.length > 0) {
  console.error("Segredos no código enviado ao browser:");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}

console.log(`Nenhum segredo no bundle do cliente (${files.length} ficheiros verificados).`);
