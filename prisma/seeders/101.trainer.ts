// npx ts-node prisma/seeders/101.trainer.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const data = Promise.all(
  Array(100)
    .fill('')
    .map(async (_, index: number) => {
      const idx = index + 1
      return {
        role_id: 3,
        email: `trainer${idx}@gmail.com`,
        username: `trainer${idx}`,
        password: await bcrypt.hash(`trainer${idx}`, 10),
        first_name: `Trainer ${idx}`,
        last_name: `James ${idx}`,
        phone: '123',
      }
    })
)

async function main() {
  const datas = await data
  datas?.map(async (item) => {
    await prisma.user.upsert({
      where: { username: item?.username },
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
