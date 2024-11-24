// npx ts-node prisma/seeders/7.config_days.seed.ts

import { PrismaClient } from '@prisma/client'
import moment from 'moment'

const prisma = new PrismaClient()

const { open, close } = {
  open: moment.utc().set({ h: 6, m: 0, s: 0 }).toISOString(false),
  close: moment.utc().set({ h: 9, m: 0, s: 0 }).toISOString(false),
}
const data = [
  { id: 1, day: 1, day_name: 'Sunday', open, close },
  { id: 2, day: 2, day_name: 'Monday', open, close },
  { id: 3, day: 3, day_name: 'Tuesday', open, close },
  { id: 4, day: 4, day_name: 'Wednesday', open, close },
  { id: 5, day: 5, day_name: 'Thrusday', open, close },
  { id: 6, day: 6, day_name: 'Friday', open, close },
  { id: 7, day: 7, day_name: 'Saturday', open, close },
]

async function main() {
  data?.map(async (item) => {
    await prisma.config_days.upsert({
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
