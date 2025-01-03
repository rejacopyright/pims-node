import { PrismaClient } from '@prisma/client'
import AuthMiddleWare from '@src/middleware/auth'
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

router.get('/payment_method', AuthMiddleWare, async (req: any, res: any) => {
  const user = req?.user
  const payment_account = await prisma.payment_account.findMany({
    where: { user_id: user?.id, status: 1 },
  })
  const data = await prisma.payment_method.findMany({ where: { status: 1 } })
  return res.status(200).json({ payment_account, data })
})

export default router
