export const env = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@example.com",
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL || "http://localhost:5173",
};
