-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "hashed_password" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "import_from_date" TIMESTAMP(3);
