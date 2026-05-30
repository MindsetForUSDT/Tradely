import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/crypto';
import { importTradesFromExchange, saveTrades, validateBybitWallet } from '../services/tradeImport';

const router = Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`[Wallets Router] ${req.method} ${req.path}`);
  next();
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  console.log('[Wallets GET] ====== START ======');
  console.log('[Wallets GET] userId:', req.userId);
  console.log('[Wallets GET] userEmail:', req.userEmail);

  let profileId: string;

  try {
    console.log('[Wallets GET] Step 1: Finding profile by clerk_id...');

    let profile = await prisma.profile.findUnique({
      where: { clerk_id: req.userId! },
    });

    console.log('[Wallets GET] Profile by clerk_id found:', !!profile);

    if (!profile) {
      console.log('[Wallets GET] Profile not found by clerk_id, checking by email...');
      // Проверяем существует ли профиль с таким email
      profile = await prisma.profile.findFirst({
        where: { email: req.userEmail! },
      });

      if (profile) {
        console.log('[Wallets GET] Profile found by email:', profile.id, 'Updating clerk_id...');
        // Обновляем clerk_id чтобы связать профили
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: { clerk_id: req.userId! },
        });
      } else {
        console.log('[Wallets GET] No profile found, creating new...');
        // Создаём новый профиль
        profile = await prisma.profile.create({
          data: {
            clerk_id: req.userId!,
            email: req.userEmail || `${req.userId}@localhost.com`,
            username: req.userId?.split('@')[0] || 'User',
          },
        });
        console.log('[Wallets GET] Profile created:', profile.id);
      }
    }

    profileId = profile.id;
    console.log('[Wallets GET] Profile ID:', profileId);
  } catch (error: any) {
    console.error('[Wallets GET] Profile error:', error.message);
    console.error('[Wallets GET] Profile stack:', error.stack);
    return res.status(500).json({ error: 'Profile error', details: error.message });
  }

  try {
    console.log('[Wallets GET] Step 2: Fetching wallets...');
    const wallets = await prisma.wallet.findMany({
      where: { user_id: profileId },
      orderBy: { added_at: 'desc' },
    });

    console.log('[Wallets GET] Wallets found:', wallets.length);
    console.log('[Wallets GET] ====== SUCCESS ======');

    res.json(wallets);
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
  console.log('[Wallets POST] userEmail:', req.userEmail);
  console.log('[Wallets POST] Request body:', JSON.stringify(req.body));

  let profileId: string;

  try {
    console.log('[Wallets POST] Step 1: Finding profile by clerk_id...');

    let profile = await prisma.profile.findUnique({
      where: { clerk_id: req.userId! },
    });

    console.log('[Wallets POST] Profile by clerk_id found:', !!profile);

    if (!profile) {
      console.log('[Wallets POST] Profile not found by clerk_id, checking by email...');
      // Проверяем существует ли профиль с таким email
      profile = await prisma.profile.findFirst({
        where: { email: req.userEmail! },
      });

      if (profile) {
        console.log('[Wallets POST] Profile found by email:', profile.id, 'Updating clerk_id...');
        // Обновляем clerk_id чтобы связать профили
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: { clerk_id: req.userId! },
        });
      } else {
        console.log('[Wallets POST] No profile found, creating new...');
        // Создаём новый профиль
        profile = await prisma.profile.create({
          data: {
            clerk_id: req.userId!,
            email: req.userEmail || `${req.userId}@localhost.com`,
            username: req.userId?.split('@')[0] || 'User',
          },
        });
        console.log('[Wallets POST] Profile created:', profile.id);
      }
    }

    profileId = profile.id;
    console.log('[Wallets POST] Profile ID:', profileId);
  } catch (error: any) {
    console.error('[Wallets POST] Profile error:', error.message);
    console.error('[Wallets POST] Profile stack:', error.stack);
    return res.status(500).json({ error: 'Profile error', details: error.message });
  }

  try {
    console.log('[Wallets POST] Step 2: Creating wallet...');
    // Шифруем API ключи если есть
    const bodySettings = req.body.settings ? JSON.parse(req.body.settings) : {};
    let encryptedCreds: { encrypted: string; iv: string; tag: string } | null = null;

    // API ключи передаются отдельно в теле запроса (не в settings)
    const apiKey = req.body.apiKey || bodySettings.apiKey;
    const apiSecret = req.body.apiSecret || bodySettings.apiSecret;
    const passphrase = req.body.apiPassphrase || bodySettings.passphrase;

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
    };

    // Обработка import_from_date
    let importFromDate = null;
    if (req.body.import_from_date) {
      try {
        importFromDate = new Date(req.body.import_from_date);
        if (isNaN(importFromDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (e) {
        console.error('[Wallets POST] Invalid import_from_date:', req.body.import_from_date);
        importFromDate = null;
      }
    }

    const walletData: any = {
      address: req.body.address || 'test',
      chain: req.body.chain || 'ethereum',
      label: req.body.label || 'Wallet',
      processing_status: req.body.processing_status || 'pending',
      user_id: profileId,
      cex_provider: req.body.cex_provider || null,
      web3_provider: req.body.web3_provider || null,
      settings: JSON.stringify(safeSettings),
      import_from_date: importFromDate,
      ...(encryptedCreds && {
        encrypted_credentials: encryptedCreds.encrypted,
        credentials_iv: encryptedCreds.iv,
        credentials_tag: encryptedCreds.tag,
      }),
    };

    console.log('[Wallets POST] Wallet data to insert:', JSON.stringify(walletData));

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
    });

    console.log('[Wallets POST] Wallet created:', wallet.id);
    console.log('[Wallets POST] ====== SUCCESS ======');

    res.json(wallet);
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
    console.log('[Wallets DELETE] userId from auth:', req.userId);

    let profile = await prisma.profile.findUnique({
      where: { clerk_id: req.userId! },
    });

    if (!profile) {
      console.log('[Wallets DELETE] Profile not found, creating...');
      profile = await prisma.profile.create({
        data: {
          clerk_id: req.userId!,
          email: req.userEmail || `${req.userId}@localhost.com`,
          username: req.userId?.split('@')[0] || 'User',
        },
      });
      console.log('[Wallets DELETE] Created profile:', profile.id);
    }

    await prisma.wallet.deleteMany({
      where: {
        id: req.params.id,
        user_id: profile.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Wallets DELETE]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint для синхронизации кошелька
router.post('/:id/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    console.log('[Wallets SYNC] userId from auth:', req.userId, 'walletId:', req.params.id);

    let profile = await prisma.profile.findUnique({
      where: { clerk_id: req.userId! },
    });

    if (!profile) {
      console.log('[Wallets SYNC] Profile not found, creating...');
      profile = await prisma.profile.create({
        data: {
          clerk_id: req.userId!,
          email: req.userEmail || `${req.userId}@localhost.com`,
          username: req.userId?.split('@')[0] || 'User',
        },
      });
      console.log('[Wallets SYNC] Created profile:', profile.id);
    }

    // Проверяем что кошелёк принадлежит пользователю
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: req.params.id,
        user_id: profile.id,
      },
    });

    if (!wallet) {
      console.log('[Wallets SYNC] Wallet not found:', req.params.id);
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    // Обновляем статус на "processing"
    await prisma.wallet.update({
      where: { id: req.params.id },
      data: { processing_status: 'processing' },
    });

    console.log('[Wallets SYNC] Started sync for wallet:', req.params.id);

    // Запускаем синхронизацию в фоне
    (async () => {
      try {
        const settings = wallet.settings ? JSON.parse(wallet.settings) : {};

        // Дешифруем API ключи
        let apiKey = '';
        let apiSecret = '';
        let passphrase: string | undefined;

        if (wallet.encrypted_credentials && wallet.credentials_iv && wallet.credentials_tag) {
          try {
            const decrypted = decrypt({
              encrypted: wallet.encrypted_credentials,
              iv: wallet.credentials_iv,
              tag: wallet.credentials_tag,
            });
            const creds = JSON.parse(decrypted);
            apiKey = creds.apiKey || '';
            apiSecret = creds.apiSecret || '';
            passphrase = creds.passphrase;
          } catch (e: any) {
            console.error('[Wallets SYNC] Decrypt error:', e.message);
          }
        }

        // Только для CEX бирж
        if (wallet.cex_provider && apiKey && apiSecret) {
          // НЕ фильтруем по дате - загружаем ВСЕ сделки
          console.log(`[Wallets SYNC] Loading all trades for ${wallet.cex_provider}`);

          const trades = await importTradesFromExchange(
            wallet.cex_provider,
            apiKey,
            apiSecret,
            passphrase,
            undefined // undefined = все сделки без фильтра по времени
          );

          const saved = await saveTrades(profile.id, wallet.id, trades);
          console.log(
            `[Wallets SYNC] Saved ${saved} trades for ${wallet.cex_provider} (from: ${startDate?.toISOString() || 'all time'})`
          );
        } else {
          console.log('[Wallets SYNC] Non-CEX wallet, skipping trade import');
        }

        await prisma.wallet.update({
          where: { id: req.params.id },
          data: {
            processing_status: 'completed',
            last_synced_at: new Date(),
          },
        });
        console.log('[Wallets SYNC] Completed sync for wallet:', req.params.id);
      } catch (err: any) {
        console.error('[Wallets SYNC] Error:', err.message);
        await prisma.wallet.update({
          where: { id: req.params.id },
          data: {
            processing_status: 'failed',
            error_message: err.message || 'Sync failed',
          },
        });
      }
    })();

    res.json({
      success: true,
      message: 'Синхронизация запущена',
      walletId: req.params.id,
    });
  } catch (error) {
    console.error('[Wallets SYNC]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
