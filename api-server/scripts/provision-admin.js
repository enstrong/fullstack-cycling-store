require("dotenv").config({
  path: require("node:path").join(__dirname, "../.env"),
});
const readline = require("node:readline");
const { stdin, stdout } = require("node:process");
const { createPool, migrate } = require("../database");
const { hashPassword } = require("../auth");

const ADMIN_EMAIL = "admin@fullstack-cycling-store.invalid";

async function hiddenInput(rl, label) {
  stdout.write(label);
  const write = rl._writeToOutput;
  rl._writeToOutput = () => {};
  try {
    return await new Promise((resolve) => rl.question("", resolve));
  } finally {
    rl._writeToOutput = write;
    stdout.write("\n");
  }
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY)
    throw new Error(
      "Run this command in a terminal so the password stays hidden.",
    );
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
  });
  let pool;
  try {
    const password = await hiddenInput(rl, "New admin password: ");
    const confirmation = await hiddenInput(rl, "Repeat admin password: ");
    if (password.length < 10 || password.length > 128)
      throw new Error("Use a password between 10 and 128 characters.");
    if (password !== confirmation)
      throw new Error("The passwords did not match.");
    pool = createPool();
    await migrate(pool);
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES('Store administrator',$1,$2,'admin')
       ON CONFLICT(email) DO UPDATE SET
         name=EXCLUDED.name,
         password_hash=EXCLUDED.password_hash,
         google_sub=NULL,
         role='admin'
       RETURNING user_id`,
      [ADMIN_EMAIL, passwordHash],
    );
    await pool.query("DELETE FROM auth_sessions WHERE user_id=$1", [
      result.rows[0].user_id,
    ]);
    stdout.write(
      "Admin account provisioned. Sign in at /admin with username admin.\n",
    );
  } finally {
    rl.close();
    if (pool) await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
