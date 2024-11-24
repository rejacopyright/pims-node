// npx ts-node prisma/seeders/5.service.seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  { id: 1, name: 'Gym Visit' },
  { id: 2, name: 'Kelas Studio' },
  { id: 3, name: 'Kelas Fungsional' },
]

async function main() {
  data?.map(async (item) => {
    await prisma.service.upsert({
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
