const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldWalletId = '253b9a2d-a068-4703-8eef-dacd3b281697';
  const newWalletId = 'fa5633f3-1909-4a33-a8f4-a78a4066893b';
  const userId = 'ea97174d-4a56-4f3c-834b-51f7b107e199';

  console.log(`Updating trades from ${oldWalletId} to ${newWalletId}...`);

  const result = await prisma.$executeRaw`
    UPDATE "trade" 
    SET wallet_id = ${newWalletId} 
    WHERE user_id = ${userId} AND wallet_id = ${oldWalletId}
  `;

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
