import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { encrypt } from '../services/crypto.js';
import { validateBybitWallet } from '../services/tradeImport.js';
import { getWalletSyncState, requestWalletSync } from '../services/walletSync.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();
const publicWalletSelect = {
  id: true,
  address: true,
  chain: true,
  label: true,
  web3_provider: true,
  cex_provider: true,
  processing_status: true,
  last_synced_at: true,
  last_processed_block: true,
  error_message: true,
  settings: true,
  import_from_date: true,
  added_at: true,
  _count: {
    select: {
      trades: true,
    },
  },
} as const;

// Debug middleware
router.use((req, res, next) => {
  console.log(`[Wallets Router] ${req.method} ${req.path}`);
  next();
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  console.log('[Wallets GET] ====== START ======');
  console.log('[Wallets GET] userId:', req.userId);

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const wallets = await prisma.wallet.findMany({
      where: { user_id: profile.id },
      orderBy: { added_at: 'desc' },
      select: publicWalletSelect,
    });

    console.log('[Wallets GET] Wallets found:', wallets.length);
    console.log('[Wallets GET] ====== SUCCESS ======');

    res.json(
      wallets.map((wallet) => ({
        ...wallet,
        sync_state: getWalletSyncState(wallet.settings, wallet.last_synced_at),
      }))
    );
  } catch (error: any) {
    console.error('[Wallets GET] Wallets error:', error.message);
    console.error('[Wallets GET] Wallets stack:', error.stack);
    res.status(500).json({
      error: 'Wallets fetch error',
      details: error.message,
      code: error.code,
    });
  }
});

router.post('/validate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { provider, apiKey, apiSecret } = req.body;

    if (!provider || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Provider, apiKey, and apiSecret required' });
    }

    if (provider.toLowerCase() === 'bybit') {
      const result = await validateBybitWallet(apiKey, apiSecret);
      res.json(result);
    } else {
      res.status(400).json({ error: 'Exchange not supported for validation' });
    }
  } catch (error: any) {
    console.error('[Wallets VALIDATE] Error:', error.message);
    res.status(500).json({ error: 'Validation error', details: error.message });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  console.log('[Wallets POST] ====== START ======');
  console.log('[Wallets POST] userId:', req.userId);
  console.log(
    '[Wallets POST] provider:',
    req.body?.cex_provider || req.body?.provider || 'unknown'
  );

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profileId = profile.id;
    const provider =
      typeof req.body.cex_provider === 'string' ? req.body.cex_provider.trim().toLowerCase() : null;
    if (provider && provider !== 'bybit') {
      return res.status(400).json({ error: 'Сейчас поддерживается только Bybit' });
    }

    let bodySettings: Record<string, unknown> = {};
    try {
      const decoded =
        typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
      if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
        bodySettings = decoded as Record<string, unknown>;
      }
    } catch {
      return res.status(400).json({ error: 'Некорректные настройки источника' });
    }
    let encryptedCreds: { encrypted: string; iv: string; tag: string } | null = null;

    // API ключи передаются отдельно в теле запроса (не в settings)
    const apiKey = String(req.body.apiKey || bodySettings.apiKey || '').trim();
    const apiSecret = String(req.body.apiSecret || bodySettings.apiSecret || '').trim();
    const passphrase = String(req.body.apiPassphrase || bodySettings.passphrase || '').trim();

    let verifiedBalance: number | undefined;
    if (provider === 'bybit') {
      if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: 'Для Bybit нужны API key и API secret' });
      }
      const validation = await validateBybitWallet(apiKey, apiSecret);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Bybit отклонил API-ключ' });
      }
      verifiedBalance = validation.balance || 0;
    }

    if (apiKey && apiSecret) {
      const creds = JSON.stringify({
        apiKey,
        apiSecret,
        ...(passphrase && { passphrase }),
      });
      encryptedCreds = encrypt(creds);
      console.log('[Wallets POST] API credentials encrypted');
    } else {
      console.log('[Wallets POST] No API credentials provided (may be Web3 wallet)');
    }

    // Settings без ключей (они в encrypted_credentials)
    const safeSettings = {
      ...bodySettings,
      apiKey: undefined,
      apiSecret: undefined,
      passphrase: undefined,
      ...(provider === 'bybit'
        ? {
            category: 'crypto',
            providerType: 'cex',
            providerId: 'bybit',
            autoSync: true,
            syncInterval: 60,
            initialBalance: verifiedBalance,
            currentBalance: verifiedBalance,
            balanceUpdatedAt: new Date().toISOString(),
          }
        : {}),
    };

    // Обработка import_from_date
    let importFromDate = null;
    if (req.body.import_from_date) {
      try {
        importFromDate = new Date(req.body.import_from_date);
        if (isNaN(importFromDate.getTime())) {
          throw new Error('Invalid date');
        }
        if (provider === 'bybit') {
          const now = new Date();
          const earliest = new Date(now);
          earliest.setUTCFullYear(earliest.getUTCFullYear() - 2);
          if (importFromDate < earliest) importFromDate = earliest;
          if (importFromDate > now) importFromDate = now;
        }
      } catch (e) {
        console.error('[Wallets POST] Invalid import_from_date:', req.body.import_from_date);
        importFromDate = null;
      }
    }

    const walletData: any = {
      address: String(req.body.address || 'test').slice(0, 200),
      chain: req.body.chain || 'ethereum',
      label:
        String(req.body.label || 'Wallet')
          .trim()
          .slice(0, 80) || 'Wallet',
      processing_status: provider ? 'pending' : req.body.processing_status || 'pending',
      user_id: profileId,
      cex_provider: provider,
      web3_provider: req.body.web3_provider || null,
      settings: JSON.stringify(safeSettings),
      import_from_date: importFromDate,
      ...(encryptedCreds && {
        encrypted_credentials: encryptedCreds.encrypted,
        credentials_iv: encryptedCreds.iv,
        credentials_tag: encryptedCreds.tag,
      }),
    };

    // Проверка существования кошелька
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        user_id: profileId,
        OR: [
          // CEX: один провайдер на пользователя
          ...(walletData.cex_provider ? [{ cex_provider: walletData.cex_provider }] : []),
          // Web3 / Брокеры: один адрес на пользователя
          ...(walletData.address && walletData.address !== 'test'
            ? [{ address: walletData.address }]
            : []),
        ],
      },
    });

    if (existingWallet) {
      const msg = walletData.cex_provider
        ? `Кошелёк для ${walletData.cex_provider.toUpperCase()} уже существует`
        : 'Кошелёк с таким адресом уже существует';
      res.status(409).json({ error: msg });
      return;
    }

    const wallet = await prisma.wallet.create({
      data: walletData,
      select: publicWalletSelect,
    });

    console.log('[Wallets POST] Wallet created:', wallet.id);
    let autoSyncStarted = false;
    if (wallet.cex_provider) {
      try {
        const syncRequest = await requestWalletSync(wallet.id, profileId);
        autoSyncStarted = syncRequest.started;
        console.log('[Wallets POST] Automatic first sync queued:', autoSyncStarted);
      } catch (syncError) {
        // The source is already persisted and can be picked up by the scheduler.
        // Do not turn a recoverable background-start failure into a duplicate
        // connection attempt in the browser.
        console.error('[Wallets POST] Automatic first sync could not start:', syncError);
      }
    }
    console.log('[Wallets POST] ====== SUCCESS ======');

    void writeAuditLog({
      action: 'source.connected',
      userId: req.userId,
      request: req,
      metadata: { provider: wallet.cex_provider || wallet.web3_provider },
    });
    res.status(201).json({
      ...wallet,
      processing_status: autoSyncStarted ? 'processing' : wallet.processing_status,
      sync_started: autoSyncStarted,
      sync_state: getWalletSyncState(wallet.settings, wallet.last_synced_at),
    });
  } catch (error: any) {
    console.error('[Wallets POST] Wallet error:', error.message);
    console.error('[Wallets POST] Wallet stack:', error.stack);
    console.error('[Wallets POST] Wallet code:', error.code);
    res.status(500).json({
      error: 'Wallet creation error',
      details: error.message,
      code: error.code,
    });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const walletId = String(req.params.id);
    console.log('[Wallets DELETE] userId from auth:', req.userId);

    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const deleted = await prisma.wallet.deleteMany({
      where: {
        id: walletId,
        user_id: profile.id,
      },
    });

    if (!deleted.count) return res.status(404).json({ error: 'Источник не найден' });
    void writeAuditLog({
      action: 'source.deleted',
      userId: req.userId,
      request: req,
      metadata: { walletId },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[Wallets DELETE]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint для синхронизации кошелька
router.post('/:id/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const walletId = String(req.params.id);
    console.log('[Wallets SYNC] userId from auth:', req.userId, 'walletId:', walletId);

    const profile = await prisma.profile.findUnique({
      where: { id: req.userId! },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Проверяем что кошелёк принадлежит пользователю
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        user_id: profile.id,
      },
    });

    if (!wallet) {
      console.log('[Wallets SYNC] Wallet not found:', walletId);
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    const syncRequest = await requestWalletSync(wallet.id, profile.id);
    console.log(
      syncRequest.started
        ? '[Wallets SYNC] Started sync for wallet:'
        : '[Wallets SYNC] Sync already processing for wallet:',
      walletId
    );

    res.status(202).json({
      success: true,
      message: syncRequest.started ? 'Синхронизация запущена' : 'Синхронизация уже выполняется',
      walletId,
      processing_status: syncRequest.processing_status,
      started: syncRequest.started,
    });
  } catch (error) {
    console.error('[Wallets SYNC]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
