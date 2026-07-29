/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,tx_hash]` on the table `trades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,cex_provider]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,address]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_wallet_id_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "trades_user_id_wallet_id_idx" ON "trades"("user_id", "wallet_id");

-- CreateIndex
CREATE INDEX "trades_user_id_timestamp_idx" ON "trades"("user_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "trades_user_id_tx_hash_key" ON "trades"("user_id", "tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_cex_provider_key" ON "wallets"("user_id", "cex_provider");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_address_key" ON "wallets"("user_id", "address");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
