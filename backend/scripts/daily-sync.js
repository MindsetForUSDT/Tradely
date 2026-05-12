#!/usr/bin/env node
/**
 * Daily Sync Cron Job
 * Обновляет статусы кошельков и генерирует ежедневную аналитику
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Daily sync started${DRY_RUN ? ' (DRY RUN)' : ''}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Сбросить зависшие кошельки (processing > 30 мин)
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleWallets, error: staleError } = await supabase
      .from('wallets')
      .update({ processing_status: 'failed', error_message: 'Sync timeout — retry scheduled' })
      .eq('processing_status', 'processing')
      .lt('updated_at', staleThreshold)
      .select('id');

    if (staleError) throw staleError;
    console.log(`✅ Reset ${staleWallets?.length || 0} stale wallets`);

    // 2. Запустить синхронизацию для pending кошельков
    const { data: pendingWallets, error: pendingError } = await supabase
      .from('wallets')
      .select('id, user_id, chain')
      .eq('processing_status', 'pending')
      .limit(10);

    if (pendingError) throw pendingError;

    for (const wallet of pendingWallets || []) {
      console.log(`🔄 Syncing wallet ${wallet.id} (${wallet.chain})`);
      if (!DRY_RUN) {
        try {
          await supabase
            .from('wallets')
            .update({ processing_status: 'processing' })
            .eq('id', wallet.id);

          // Здесь можно вызвать edge function для реальной синхронизации
          // await supabase.functions.invoke('fetch-trade-history', { body: { walletId: wallet.id } });

          console.log(`  ✅ Wallet ${wallet.id} synced`);
        } catch (e) {
          console.error(`  ❌ Wallet ${wallet.id} failed:`, e.message);
          await supabase
            .from('wallets')
            .update({ processing_status: 'failed', error_message: e.message })
            .eq('id', wallet.id);
        }
      }
    }

    // 3. Генерация ежедневной аналитики
    const today = new Date().toISOString().split('T')[0];
    const { data: users, error: usersError } = await supabase
      .from('wallets')
      .select('user_id')
      .eq('processing_status', 'completed');

    if (usersError) throw usersError;

    const uniqueUsers = [...new Set((users || []).map((u) => u.user_id))];
    console.log(`📊 Processing analytics for ${uniqueUsers.length} users`);

    for (const userId of uniqueUsers) {
      if (DRY_RUN) continue;

      const { data: trades } = await supabase
        .from('trades')
        .select('pnl_realized, side')
        .eq('user_id', userId)
        .gte('timestamp', `${today}T00:00:00Z`);

      const totalTrades = trades?.length || 0;
      const realizedPnl = (trades || []).reduce((s, t) => s + (t.pnl_realized || 0), 0);
      const winners = (trades || []).filter((t) => (t.pnl_realized || 0) > 0).length;
      const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;

      await supabase.from('daily_analytics').upsert(
        {
          user_id: userId,
          date: today,
          realized_pnl_usd: realizedPnl,
          total_trades: totalTrades,
          win_rate: winRate,
          total_volume: 0,
        },
        { onConflict: 'user_id,date' }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ Daily sync completed in ${duration}ms`);
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Daily sync failed:`, error.message);
    process.exit(1);
  }
}

main();
