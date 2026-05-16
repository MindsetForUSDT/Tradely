import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function SupabaseDebug() {
  const [status, setStatus] = useState<{
    url: string;
    keyExists: boolean;
    session: any;
    healthCheck: string;
    testQuery: string;
  }>({
    url: '',
    keyExists: false,
    session: null,
    healthCheck: 'checking...',
    testQuery: '',
  });

  useEffect(() => {
    const checkStatus = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL || '';
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      setStatus((prev) => ({
        ...prev,
        url: url ? `${url.substring(0, 30)}...` : 'NOT SET',
        keyExists: !!key,
      }));

      // Проверка сессии
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      setStatus((prev) => ({
        ...prev,
        session: session ? { userId: session.user.id, email: session.user.email } : null,
        healthCheck: error ? `❌ ${error.message}` : '✅ Session check OK',
      }));

      // Тестовый запрос
      try {
        const { data, error: queryError } = await supabase.from('wallets').select('count').limit(1);

        setStatus((prev) => ({
          ...prev,
          testQuery: queryError
            ? `❌ ${queryError.message}`
            : `✅ Query OK (${data?.length || 0} rows)`,
        }));
      } catch (e: any) {
        setStatus((prev) => ({
          ...prev,
          testQuery: `❌ ${e.message}`,
        }));
      }
    };

    checkStatus();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '15px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '400px',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🔧 Supabase Debug</h3>
      <div style={{ color: '#888' }}>
        <div>
          <strong>URL:</strong> {status.url}
        </div>
        <div>
          <strong>API Key:</strong> {status.keyExists ? '✅ Set' : '❌ Missing'}
        </div>
        <div>
          <strong>Session:</strong>{' '}
          {status.session ? `✅ ${status.session.email}` : '❌ No session'}
        </div>
        <div>
          <strong>Health:</strong> {status.healthCheck}
        </div>
        <div>
          <strong>Query:</strong> {status.testQuery}
        </div>
      </div>
    </div>
  );
}
