import { prisma } from "../../config/db";
import { env } from "../../config/env";

// Promotes the accounts listed in ADMIN_EMAILS to ADMIN. Idempotent and
// additive — it never demotes anyone.
export const promoteConfiguredAdmins = async () => {
  if (env.ADMIN_EMAILS.length === 0) return;

  const { count } = await prisma.user.updateMany({
    where: {
      role: { not: "ADMIN" },
      OR: env.ADMIN_EMAILS.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
    },
    data: { role: "ADMIN" },
  });

  if (count > 0) console.log(`Promoted ${count} account(s) to ADMIN from ADMIN_EMAILS`);
};
