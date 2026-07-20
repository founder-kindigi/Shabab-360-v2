/* eslint-disable @typescript-eslint/no-require-imports -- This CJS runner loads the isolated Postgres client. */
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

class BootstrapError extends Error {}

function loadTargetPrismaClient() {
  try {
    return require("../prisma/generated/postgres-client").PrismaClient;
  } catch {
    throw new BootstrapError("Generate the staged Postgres client first with npm run db:postgres:generate");
  }
}

function requireDirectUrl() {
  const url = process.env.DIRECT_URL;
  if (!url?.startsWith("postgres")) {
    throw new BootstrapError("DIRECT_URL must be the direct PostgreSQL URL; never use a pooled runtime URL for bootstrap");
  }
  return url;
}

function parseArgs(args) {
  const options = { execute: false, revealTemporaryPassword: false, replaceExistingSuperAdmin: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") {
      options.execute = true;
      continue;
    }
    if (argument === "--reveal-temporary-password") {
      options.revealTemporaryPassword = true;
      continue;
    }
    if (argument === "--replace-existing-super-admin") {
      options.replaceExistingSuperAdmin = true;
      continue;
    }
    if (argument !== "--email" && argument !== "--name") {
      throw new BootstrapError(`Unexpected argument: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new BootstrapError(`Missing value for ${argument}`);
    }
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function normalizeOptions(options) {
  const email = options.email?.trim().toLowerCase();
  const name = options.name?.trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BootstrapError("Provide a valid --email");
  }
  if (!name || name.length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new BootstrapError("Provide a --name between 2 and 120 printable characters");
  }
  if (options.revealTemporaryPassword && !options.execute) {
    throw new BootstrapError("--reveal-temporary-password can only be used with --execute");
  }
  if (options.replaceExistingSuperAdmin && !options.execute) {
    throw new BootstrapError("--replace-existing-super-admin can only be used with --execute");
  }
  return {
    email,
    name,
    execute: options.execute,
    revealTemporaryPassword: options.revealTemporaryPassword,
    replaceExistingSuperAdmin: options.replaceExistingSuperAdmin,
  };
}

function createTemporaryPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

async function createSuperAdmin(client, { email, name, temporaryPassword, replaceExistingSuperAdmin }) {
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  return client.$transaction(async (tx) => {
    const [existingEmail, existingSuperAdmin] = await Promise.all([
      tx.user.findUnique({ where: { email }, select: { id: true } }),
      tx.staffMeta.findFirst({ where: { role: "super_admin" }, select: { id: true, userId: true } }),
    ]);
    if (existingEmail) throw new BootstrapError("A user with this email already exists; no changes were made");
    if (existingSuperAdmin && !replaceExistingSuperAdmin) {
      throw new BootstrapError("A Super Admin already exists; no changes were made");
    }
    if (existingSuperAdmin) {
      // Owner-approved replacement: User deletion cascades StaffMeta while
      // audit records remain with a null actor because the relation is SetNull.
      await tx.user.delete({ where: { id: existingSuperAdmin.userId } });
    }

    const user = await tx.user.create({
      data: { email, name, passwordHash, mustResetPwd: true, isActive: true },
      select: { id: true },
    });
    await tx.staffMeta.create({ data: { userId: user.id, role: "super_admin", isActive: true } });
    await tx.auditLog.create({
      data: {
        action: replaceExistingSuperAdmin ? "replace_super_admin" : "bootstrap_super_admin",
        entityType: "user",
        entityId: user.id,
        newValues: JSON.stringify({ role: "super_admin", mustResetPwd: true, bootstrap: true, replacedExistingSuperAdmin: replaceExistingSuperAdmin }),
      },
    });
    return user;
  }, { isolationLevel: "Serializable", timeout: 15000 });
}

function usage() {
  return "Usage: npm run bootstrap:super-admin -- --email <email> --name <display-name> [--execute --reveal-temporary-password --replace-existing-super-admin]";
}

async function main() {
  const options = normalizeOptions(parseArgs(process.argv.slice(2)));
  if (!options.execute) {
    console.log(JSON.stringify({ mode: "dry-run", writesPerformed: false, role: "super_admin", nextStep: "Re-run with --execute --reveal-temporary-password after verifying the target database and intended account." }, null, 2));
    return;
  }
  if (!options.revealTemporaryPassword) {
    throw new BootstrapError("Refusing to create an undisclosed credential. Add --reveal-temporary-password only when the authorized owner is present.");
  }

  const TargetPrismaClient = loadTargetPrismaClient();
  const client = new TargetPrismaClient({ datasources: { db: { url: requireDirectUrl() } } });
  const temporaryPassword = createTemporaryPassword();
  try {
    await createSuperAdmin(client, { ...options, temporaryPassword });
    console.log("Super Admin created. Record this temporary password only in the approved secure channel; it is shown once and is never stored in source control or audit logs.");
    console.log(temporaryPassword);
  } finally {
    await client.$disconnect();
  }
}

module.exports = { BootstrapError, createTemporaryPassword, normalizeOptions, parseArgs, usage };

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof BootstrapError ? error.message : "database operation failed without creating a confirmed account";
    console.error(`Super Admin bootstrap aborted: ${message}`);
    process.exitCode = 1;
  });
}
