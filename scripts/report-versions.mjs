// Prints the Node and npm versions, the declared and INSTALLED version of every dependency,
// and checks that the key packages are compatible with each other. Run: npm run versions
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const installed = (name) => {
  const file = `node_modules/${name}/package.json`;
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).version : null;
};
const major = (v) => (v ? Number(v.split(".")[0]) : null);
let npmVersion = "unknown";
try { npmVersion = execSync("npm -v", { encoding: "utf8" }).trim(); } catch { /* ignore */ }

console.log(`Node ${process.version}   npm ${npmVersion}   engines.node ${pkg.engines?.node ?? "(none)"}`);
console.log(existsSync("package-lock.json") ? "package-lock.json: present" : "package-lock.json: MISSING (run npm install and commit it)");
console.log("");
for (const [section, deps] of [["dependencies", pkg.dependencies], ["devDependencies", pkg.devDependencies]]) {
  console.log(section);
  for (const [name, range] of Object.entries(deps ?? {})) {
    console.log(`  ${name.padEnd(28)} declared ${String(range).padEnd(10)} installed ${installed(name) ?? "not installed"}`);
  }
}

const v = (n) => installed(n);
const checks = [];
const check = (ok, message) => checks.push([ok === null ? "SKIP" : ok ? "OK  " : "WARN", message]);

check(major(process.versions.node) >= 22, "Node is 22 or newer (engines requirement)");
check(v("next") && v("eslint-config-next") ? major(v("next")) === major(v("eslint-config-next")) : null, "eslint-config-next has the same major version as next");
check(v("react") && v("react-dom") ? v("react") === v("react-dom") : null, "react and react-dom are the same version");
check(v("next") ? major(v("next")) === 16 : null, "next is 16.x (the version this project targets)");
check(v("react") ? Number(v("react").split(".")[1]) >= 2 && major(v("react")) === 19 : null, "react is 19.2 or newer (required by Next 16)");
check(existsSync("src/proxy.ts") && !existsSync("src/middleware.ts"), "src/proxy.ts exists and the old src/middleware.ts is gone");
check(v("typescript") ? major(v("typescript")) === 5 : null, "typescript is 5.x (6.x is not adopted yet)");
check(v("eslint") ? major(v("eslint")) === 9 : null, "eslint is 9.x");
check(v("tailwindcss") && v("@tailwindcss/postcss") ? v("tailwindcss") === v("@tailwindcss/postcss") || major(v("tailwindcss")) === major(v("@tailwindcss/postcss")) : null, "tailwindcss and @tailwindcss/postcss share a major version");
check(v("@supabase/ssr") && v("@supabase/supabase-js") ? major(v("@supabase/supabase-js")) === 2 : null, "@supabase/supabase-js is 2.x");
console.log("\nCompatibility");
for (const [state, message] of checks) console.log(`  ${state}  ${message}`);
if (!existsSync("node_modules")) console.log("\nnode_modules is missing: run npm install first.");
