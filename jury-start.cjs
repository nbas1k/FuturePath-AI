const { constants, copyFileSync, existsSync, readFileSync, readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { parseEnv } = require("node:util");

const configPath = ".env.jury";
const groqBase = "https://api.groq.com/openai/v1";
const configKeys = Object.keys(parseEnv(readFileSync(".env.example", "utf8")));
const prisma = "node_modules/prisma/build/index.js";

function neonUrl(config, key, direct) {
  let url;
  try {
    url = new URL(config[key]);
  } catch {
    throw new Error(`Set ${key} in ${configPath}. Copy the ${direct ? "direct" : "pooled"} URL from Neon.`);
  }
  const host = url.hostname.split(".")[0];
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname.endsWith(".neon.tech") || !url.username || !url.password ||
      url.pathname !== "/futurepath_jury" ||
      !["require", "verify-full"].includes(url.searchParams.get("sslmode")) ||
      (direct === host.endsWith("-pooler"))) {
    throw new Error(`${key} must be a TLS Neon URL for futurepath_jury${direct ? " using the direct endpoint" : " using the pooled endpoint"}.`);
  }
  return url;
}

function loadConfig() {
  if (!existsSync(configPath)) {
    copyFileSync(existsSync("jury-config.env") ? "jury-config.env" : ".env.example", configPath, constants.COPYFILE_EXCL);
    if (!existsSync("jury-config.env")) throw new Error(`Created ${configPath}. Fill it with the jury credentials and run again.`);
  }
  const config = parseEnv(readFileSync(configPath, "utf8"));
  const pooled = neonUrl(config, "DATABASE_URL", false);
  const direct = neonUrl(config, "DIRECT_DATABASE_URL", true);
  if (pooled.hostname.replace(/-pooler(?=\.)/, "") !== direct.hostname ||
      pooled.username !== direct.username || pooled.password !== direct.password ||
      (pooled.searchParams.get("schema") ?? "public") !== "public" ||
      (direct.searchParams.get("schema") ?? "public") !== "public") {
    throw new Error("Both Neon URLs must use the same branch, database, role, password and public schema.");
  }
  if (config.AI_PROVIDER !== "groq" || !config.GROQ_API_KEY?.trim() || !config.GROQ_MODEL?.trim()) {
    throw new Error("Set AI_PROVIDER=groq, GROQ_API_KEY and GROQ_MODEL in .env.jury.");
  }
  const password = config.JURY_DEMO_PASSWORD;
  if (password && (password.length < 8 || password.length > 128)) {
    throw new Error("JURY_DEMO_PASSWORD must contain 8 to 128 characters.");
  }

  const env = { ...process.env };
  // Prevent a developer's .env, .env.local or shell variables from filling jury settings.
  for (const key of configKeys) env[key] = config[key] ?? "";
  return { ...env, GROQ_API_KEY: config.GROQ_API_KEY.trim(), GROQ_MODEL: config.GROQ_MODEL.trim(), GROQ_API_URL: groqBase, COOKIE_SECURE: "false", ADMIN_SECRET: "" };
}

function run(command, args, env, error, { input, quiet = false, shell = false } = {}) {
  const result = spawnSync(command, args, {
    env, input, shell,
    stdio: [input ? "pipe" : "inherit", quiet ? "pipe" : "inherit", quiet ? "pipe" : "inherit"],
  });
  if (result.status !== 0) {
    const code = quiet && /\bP\d{4}\b/.exec(result.stderr?.toString() ?? "");
    throw new Error(code ? `${error} (${code[0]})` : error);
  }
}

async function checkGroq(env) {
  let response;
  try {
    response = await fetch(`${groqBase}/chat/completions`, {
      method: "POST",
      redirect: "error",
      headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [{ role: "user", content: "Reply with OK." }],
        max_completion_tokens: 512,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (response.ok && (await response.json())?.choices?.[0]?.message?.content?.trim()) return;
  } catch {
    throw new Error("Could not validate Groq. Check internet access and try again.");
  }
  const errorBody = response.ok ? null : await response.json().catch(() => null);
  const code = errorBody?.error?.code;
  const detail = typeof code === "string" && /^[a-z_]{1,60}$/.test(code) ? `, ${code}` : "";
  const hint = response.status === 404
    ? "Set GROQ_MODEL in .env.jury to a chat model available to your Groq project."
    : "Check the key, model access and quota.";
  throw new Error(`Groq check failed (HTTP ${response.status}${detail}). ${hint}`);
}

async function main() {
  const env = loadConfig();
  console.log("[1/7] Checking Groq key and chat model...");
  await checkGroq(env);

  console.log("[2/7] Installing locked npm dependencies...");
  const installEnv = { ...process.env, PRISMA_SKIP_POSTINSTALL_GENERATE: "true" };
  for (const key of configKeys) delete installEnv[key];
  run("npm.cmd", ["ci", "--include=dev"], installEnv,
    "npm ci failed. Check internet access and the npm output above.", { shell: true });

  console.log("[3/7] Generating Prisma Client...");
  run(process.execPath, [prisma, "generate"], env, "Prisma generate failed. See the output above.");

  console.log("[4/7] Checking both Neon connections...");
  for (const key of ["DIRECT_DATABASE_URL", "DATABASE_URL"]) {
    run(process.execPath, [prisma, "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
      { ...env, DATABASE_URL: env[key], DIRECT_DATABASE_URL: env[key] },
      `${key} connection failed. Check Neon credentials, TLS, branch and network access.`,
      { input: "SELECT 1;", quiet: true });
  }

  const hasMigrations = existsSync("prisma/migrations") && readdirSync("prisma/migrations", { withFileTypes: true })
    .some((entry) => entry.isDirectory() && existsSync(`prisma/migrations/${entry.name}/migration.sql`));
  console.log("[5/7] Preparing the demo database...");
  if (hasMigrations) {
    run(process.execPath, [prisma, "migrate", "deploy"], env,
      "migrate deploy failed. Check migration history and role permissions. Use a fresh jury database if needed.", { quiet: true });
  } else {
    console.log("No migrations found. The database must already have the correct schema.");
  }
  if (env.JURY_DEMO_PASSWORD) {
    run(process.execPath, ["scripts/jury-seed.cjs"], env,
      "Demo seed failed. Check database write permissions and migration history.");
  }

  console.log("[6/7] Building FuturePath AI...");
  const next = "node_modules/next/dist/bin/next";
  run(process.execPath, [next, "build"], env, "Next.js build failed. See the output above.");

  console.log("[7/7] Open http://localhost:3001 after Next.js reports Ready. Press Ctrl+C to stop.");
  run(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", "3001"], env,
    "Next.js stopped. Check whether port 3001 is in use and read the output above.");
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});