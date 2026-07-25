import { isProduction, requiredEnv } from '../config/env.js';

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (isProduction) {
      requiredEnv('RESEND_API_KEY');
      requiredEnv('EMAIL_FROM');
    }
    console.info(`[Email] Development password reset for ${email}: ${resetUrl}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Восстановление пароля TradeumDiary',
      html: `<p>Вы запросили восстановление пароля TradeumDiary.</p><p><a href="${resetUrl}">Установить новый пароль</a></p><p>Ссылка действует один час. Если запрос сделали не вы, проигнорируйте письмо.</p>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Email provider rejected request (${response.status}): ${details.slice(0, 300)}`
    );
  }
}
