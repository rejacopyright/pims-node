// npx ts-node prisma/seeders/3.occupation.seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  { id: 1, name: 'Pelajar/Mahasiswa' },
  { id: 2, name: 'Karyawan Swasta' },
  { id: 3, name: 'Karyawan BUMN/ASN' },
  { id: 4, name: 'Wiraswasta' },
  { id: 5, name: 'Pekerja Lepas/Freelance' },
  { id: 6, name: 'Ibu Rumah Tangga' },
  { id: 7, name: 'Lainnya' },
]

async function main() {
  data?.map(async (item) => {
    await prisma.occupation.upsert({
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
