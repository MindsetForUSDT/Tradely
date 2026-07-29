const MIN_SECRET_LENGTH = 32;

export const isProduction = process.env.NODE_ENV === 'production';

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[Config] ${name} is required`);
  return value;
}

export function requiredSecret(name: string): string {
  const value = requiredEnv(name);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`[Config] ${name} must contain at least ${MIN_SECRET_LENGTH} characters`);
  }
  return value;
}

export function validateRuntimeConfig(): void {
  requiredEnv('DATABASE_URL');
  requiredSecret('JWT_SECRET');
  requiredSecret('ENCRYPTION_KEY');

  if (isProduction) {
    requiredEnv('APP_URL');
    requiredEnv('RESEND_API_KEY');
    requiredEnv('EMAIL_FROM');
  }
}
