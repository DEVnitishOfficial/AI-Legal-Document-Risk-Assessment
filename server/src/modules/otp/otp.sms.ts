import { env } from "../../config/env";
import { logger } from "../../config/logger";

export const sendOtpSms = async (phone: string, code: string): Promise<void> => {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    // Deliberately a plain string, not a structured `{ code }` field — the
    // logger redacts any `code` property by default (see logger.ts), but
    // this line only ever fires in dev/test mode and exists specifically
    // so a developer can see the code without the API response's devCode.
    logger.info(`[DEV OTP] ${phone}: ${code}`);
    return;
  }

  const res = await fetch("https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID,
      recipients: [
        {
          mobiles: phone.replace(/^\+/, ""),
          otp: code,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "MSG91 send failed");
    throw new Error("Failed to send OTP SMS");
  }
};
