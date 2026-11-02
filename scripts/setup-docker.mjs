import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
const secret = () => randomBytes(32).toString("hex");
try {
  writeFileSync(
    ".env.docker",
    `# Local Docker configuration. Never commit this file.\nAPP_URL=http://localhost:3001\nNEXTAUTH_SECRET=${secret()}\nOTP_SECRET=${secret()}\nBANK_ACCOUNT_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\nWEBHOOK_SECRET=${secret()}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created .env.docker with private random secrets. Run docker compose --env-file .env.docker up --build -d",
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.docker already exists; preserved existing secrets.");
}
