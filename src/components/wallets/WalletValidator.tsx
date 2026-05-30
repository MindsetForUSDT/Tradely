import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface WalletValidatorProps {
  provider: string;
  apiKey: string;
  apiSecret: string;
  onValidation: (valid: boolean, balance?: number) => void;
}

export function WalletValidator({
  provider,
  apiKey,
  apiSecret,
  onValidation,
}: WalletValidatorProps) {
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!apiKey || !apiSecret) {
      setError('API ключи обязательны');
      return;
    }

    setValidating(true);
    setError(null);
    setValid(null);

    try {
      const result = await api.post<any>('/wallets/validate', {
        provider,
        apiKey,
        apiSecret,
      });

      if (result.valid) {
        setValid(true);
        setBalance(result.balance ?? null);
        onValidation(true, result.balance);
      } else {
        setValid(false);
        setError(result.error || 'Неверные API ключи');
        onValidation(false);
      }
    } catch (err: any) {
      setValid(false);
      setError(err.message || 'Ошибка проверки');
      onValidation(false);
    } finally {
      setValidating(false);
    }
  };

  if (validating) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-accent-cyan border-t-transparent rounded-full" />
          <p className="text-sm text-text-secondary">Проверка API ключей...</p>
        </div>
      </Card>
    );
  }

  if (valid === true) {
    return (
      <Card padding="md" className="bg-success/10 border-success/20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-success">Кошелёк валиден</p>
            {balance !== null && (
              <p className="text-xs text-text-secondary">Баланс: ${balance.toFixed(2)}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (valid === false) {
    return (
      <Card padding="md" className="bg-error/10 border-error/20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-error">{error || 'Неверные API ключи'}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleValidate}
          disabled={!apiKey || !apiSecret}
          className="flex-1"
          size="sm"
        >
          Проверить API ключи
        </Button>
        <p className="text-xs text-text-muted">Проверит существование кошелька и покажет баланс</p>
      </div>
    </Card>
  );
}
