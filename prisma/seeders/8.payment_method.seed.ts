// npx ts-node prisma/seeders/8.payment_method.seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  { type: 1, name: 'bca', label: 'BCA', description: 'Virtual Account', deadline: 30, fee: 5000 },
  { type: 1, name: 'bni', label: 'BNI', description: 'Virtual Account', deadline: 30, fee: 5000 },
  {
    type: 1,
    name: 'mandiri',
    label: 'Mandiri',
    description: 'Bill Payment',
    deadline: 30,
    fee: 5000,
  },
  { type: 1, name: 'bri', label: 'BRI', description: 'Virtual Account', deadline: 30, fee: 5000 },
  {
    type: 1,
    name: 'permata',
    label: 'Permata',
    description: 'Virtual Account',
    deadline: 30,
    fee: 5000,
  },
  {
    type: 1,
    name: 'danamon',
    label: 'Danamon',
    description: 'Virtual Account',
    deadline: 30,
    fee: 5000,
    status: 0,
  },
  { type: 1, name: 'cimb', label: 'CIMB', description: 'Virtual Account', deadline: 30, fee: 5000 },
  { type: 2, name: 'gopay', label: 'Gopay', description: 'E-Wallet', deadline: 30, fee: 5000 },
  {
    type: 2,
    name: 'shopee_pay',
    label: 'Shopee Pay',
    description: 'E-Wallet',
    deadline: 30,
    fee: 5000,
  },
  {
    type: 3,
    name: 'alfamaret',
    label: 'Alfamaret',
    description: 'Bayar di Konter',
    deadline: 30,
    fee: 4000,
  },
  {
    type: 3,
    name: 'indomaret',
    label: 'Indomaret',
    description: 'Bayar di Konter',
    deadline: 30,
    fee: 4000,
  },
  {
    type: 4,
    name: 'qris',
    label: 'QRIS',
    description: 'Bayar Menggunakan QRIS',
    deadline: 30,
    fee: 3000,
  },
  {
    type: 4,
    name: 'cod',
    label: 'COD',
    description: 'Bayar di Tempat',
    deadline: 30,
    fee: 0,
  },
  {
    type: 4,
    name: 'corporate',
    label: 'Corporate',
    description: 'Dibayar oleh perusahaan',
    deadline: 30,
    fee: 0,
  },
]

async function main() {
  data?.map(async (item) => {
    await prisma.payment_method.upsert({
      where: { name: item?.name },
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
