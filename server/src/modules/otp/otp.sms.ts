import { env } from "../../config/env";

export const sendOtpSms = async (phone: string, code: string): Promise<void> => {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    console.log(`[DEV OTP] ${phone}: ${code}`);
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
    console.error("MSG91 send failed:", res.status, body);
    throw new Error("Failed to send OTP SMS");
  }
};
