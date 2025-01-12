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

router.get('/', async (req: any, res: any) => {
  try {
    const data: any = {}
    data.user_regular_count = await prisma.user.count({ where: { role_id: 1, status: 1 } })
    data.user_member_count = await prisma.user.count({ where: { role_id: 2, status: 1 } })
    data.user_trainer_count = await prisma.user.count({ where: { role_id: 3, status: 1 } })

    return res.status(200).json(data)
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router
