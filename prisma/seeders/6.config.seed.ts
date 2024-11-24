// npx ts-node prisma/seeders/6.config.seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [{ id: 1, voucher_new_user_value: 20000, voucher_new_user_type: 1 }]

async function main() {
  data?.map(async (item) => {
    await prisma.config.upsert({
      where: { id: item?.id },
      update: item,
      create: item,
    })
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
