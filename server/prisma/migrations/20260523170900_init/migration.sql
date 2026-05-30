-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "avatar_url" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "subscription_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "label" TEXT,
    "encrypted_credentials" TEXT,
    "credentials_iv" TEXT,
    "credentials_tag" TEXT,
    "web3_provider" TEXT,
    "cex_provider" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "last_synced_at" TIMESTAMP(3),
    "last_processed_block" INTEGER,
    "error_message" TEXT,
    "settings" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT,
    "tx_hash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" INTEGER,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "price_usd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "value_usd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fee_usd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pnl_realized" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pnl_unrealized" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "exchange" TEXT,
    "import_source" TEXT NOT NULL DEFAULT 'manual',
    "raw_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#00FFA3',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_tags" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "trade_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "winning_trades" INTEGER NOT NULL DEFAULT 0,
    "losing_trades" INTEGER NOT NULL DEFAULT 0,
    "realized_pnl_usd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "volume_usd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "avg_trade_size" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "max_drawdown" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "sharpe_ratio" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "win_rate" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_clerk_id_key" ON "profiles"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trade_tags_trade_id_tag_id_key" ON "trade_tags"("trade_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_user_id_date_key" ON "daily_analytics"("user_id", "date");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_analytics" ADD CONSTRAINT "daily_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
