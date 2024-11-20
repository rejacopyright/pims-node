// npx ts-node prisma/seeders/religion.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  { id: 1, name: 'Islam' },
  { id: 2, name: 'Kristen' },
  { id: 3, name: 'Katolik' },
  { id: 4, name: 'Hindu' },
  { id: 5, name: 'Buddha' },
  { id: 6, name: 'Khonghucu' },
]

async function main() {
  data?.map(async (item) => {
    await prisma.religion.upsert({
      where: { id: item?.id },
      update: {},
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
