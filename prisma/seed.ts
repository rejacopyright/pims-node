import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const seed = async () => {
  // add path for seed files
  const seedFilesPath = path.join(__dirname, './seeders')

  const seedFiles = fs
    .readdirSync(seedFilesPath)
    .filter((file: string) => file.endsWith('.seed.ts'))
    .sort((a, b) => {
      const aa = parseInt(a?.split('.')?.[0] || '0')
      const bb = parseInt(b?.split('.')?.[0] || '0')
      return aa - bb
    })

  for (const seedFile of seedFiles) {
    const seedFilePath = path.join(seedFilesPath, seedFile.toString())
    await exec(`ts-node ${seedFilePath}`)
  }
}

seed()
  .catch((error) => {
    console.error('Seeding error:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
