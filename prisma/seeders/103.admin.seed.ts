// npx ts-node prisma/seeders/103.admin.seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@pimsclub.id' },
    update: {},
    create: {
      role_id: 4,
      email: 'admin@pimsclub.id',
      username: 'admin',
      password: await bcrypt.hash('gulaaren', 10),
      first_name: 'Admin',
      last_name: 'Super',
      phone: '123',
    },
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
