import { PrismaClient } from '@prisma/client'
import express from 'express'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/config', async (req: any, res: any) => {
  const data = await prisma.config.findFirst()
  return res.status(200).json(data)
})

router.get('/payment_method', async (req: any, res: any) => {
  const data = await prisma.payment_method.findMany()
  return res.status(200).json(data)
})

export default router
