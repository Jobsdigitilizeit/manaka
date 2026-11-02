import nodemailer, { type Transporter } from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface SendResult {
  /** True when a real SMTP server accepted the message. */
  delivered: boolean;
}

let transporter: Transporter | null = null;

export const MAIL_CONFIGURED = Boolean(process.env.SMTP_HOST);

function getTransporter(): Transporter | null {
  if (!MAIL_CONFIGURED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured: nothing leaves the machine. The body is intentionally not logged in
    // production so one-time codes never end up in log aggregation.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[mail:dev] To: ${mail.to} | ${mail.subject}\n${mail.text}\n`);
    } else {
      console.warn(`[mail] SMTP_HOST is not configured; email "${mail.subject}" to ${mail.to} was not sent.`);
    }
    return { delivered: false };
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || 'Skillix <no-reply@skillix.gov.za>', ...mail });
    return { delivered: true };
  } catch (err) {
    console.error('[mail] delivery failed:', err instanceof Error ? err.message : err);
    return { delivered: false };
  }
}
