import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
async function main() {
  const john = await prisma.user.upsert({
    where: { email: 'john@prisma.io' },
    update: {},
    create: {
      email: 'john@prisma.io',
      username: 'john',
      password: await bcrypt.hash('john', 10),
      first_name: 'John',
      last_name: 'Doe',
      phone: '123',
    },
  })
  const jane = await prisma.user.upsert({
    where: { email: 'jane@prisma.io' },
    update: {},
    create: {
      email: 'jane@prisma.io',
      username: 'jane',
      password: await bcrypt.hash('jane', 10),
      first_name: 'Jane',
      last_name: 'Doe',
      phone: '123',
    },
  })
  console.log({ john, jane })
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
