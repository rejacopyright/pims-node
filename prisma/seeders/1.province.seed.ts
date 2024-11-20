// npx ts-node prisma/seeders/1.province.seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  { id: 1, name: 'Aceh', latitude: '4695135', longitude: '967493993' },
  { id: 2, name: 'Sumatera Utara', latitude: '21153547', longitude: '995450974' },
  { id: 3, name: 'Sumatera Barat', latitude: '-7399397', longitude: '1008000051' },
  { id: 4, name: 'Riau', latitude: '2933469', longitude: '1017068294' },
  { id: 5, name: 'Jambi', latitude: '-14851831', longitude: '1024380581' },
  { id: 6, name: 'Sumatera Selatan', latitude: '-33194374', longitude: '103914399' },
  { id: 7, name: 'Bengkulu', latitude: '-35778471', longitude: '1023463875' },
  { id: 8, name: 'Lampung', latitude: '-45585849', longitude: '1054068079' },
  { id: 9, name: 'Kepulauan Bangka Belitung', latitude: '-27410513', longitude: '1064405872' },
  { id: 10, name: 'Kepulauan Riau', latitude: '39456514', longitude: '1081428669' },
  { id: 11, name: 'DKI Jakarta', latitude: '-6211544', longitude: '106845172' },
  { id: 12, name: 'Jawa Barat', latitude: '-7090911', longitude: '107668887' },
  { id: 13, name: 'Jawa Tengah', latitude: '-7150975', longitude: '1101402594' },
  { id: 14, name: 'DI Yogyakarta', latitude: '-78753849', longitude: '1104262088' },
  { id: 15, name: 'Jawa Timur', latitude: '-75360639', longitude: '1122384017' },
  { id: 16, name: 'Banten', latitude: '-64058172', longitude: '1060640179' },
  { id: 17, name: 'Bali', latitude: '-84095178', longitude: '115188916' },
  { id: 18, name: 'Nusa Tenggara Barat', latitude: '-86529334', longitude: '1173616476' },
  { id: 19, name: 'Nusa Tenggara Timur', latitude: '-86573819', longitude: '1210793705' },
  { id: 20, name: 'Kalimantan Barat', latitude: '-2787808', longitude: '1114752851' },
  { id: 21, name: 'Kalimantan Tengah', latitude: '-16814878', longitude: '1133823545' },
  { id: 22, name: 'Kalimantan Selatan', latitude: '-30926415', longitude: '1152837585' },
  { id: 23, name: 'Kalimantan Timur', latitude: '16406296', longitude: '116419389' },
  { id: 24, name: 'Sulawesi Utara', latitude: '6246932', longitude: '1239750018' },
  { id: 25, name: 'Sulawesi Tengah', latitude: '-14300254', longitude: '1214456179' },
  { id: 26, name: 'Sulawesi Selatan', latitude: '-36687994', longitude: '1199740534' },
  { id: 27, name: 'Sulawesi Tenggara', latitude: '-414491', longitude: '122174605' },
  { id: 28, name: 'Gorontalo', latitude: '6999372', longitude: '1224467238' },
  { id: 29, name: 'Sulawesi Barat', latitude: '-28441371', longitude: '1192320784' },
  { id: 30, name: 'Maluku', latitude: '-32384616', longitude: '1301452734' },
  { id: 31, name: 'Maluku Utara', latitude: '15709993', longitude: '1278087693' },
  { id: 32, name: 'Papua Barat', latitude: '-13361154', longitude: '1331747162' },
  { id: 33, name: 'Papua', latitude: '-4269928', longitude: '1380803529' },
]

async function main() {
  data?.map(async (item) => {
    await prisma.province.upsert({
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
