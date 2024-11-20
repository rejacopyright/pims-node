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

router.get('/me', async (req: any, res: any) => {
  const { user } = req
  const data = await prisma.user.findFirst({
    where: {
      id: user?.id || '',
    },
    include: {
      religion: true,
      occupation: true,
      province: true,
      city: true,
    },
  })
  console.log(user?.id, data)
  return res.status(200).json(data)
})

export default router
