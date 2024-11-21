import { PrismaClient } from '@prisma/client'
import express from 'express'
import { sendMail } from '@helper/mail'
import moment from 'moment'
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
  return res.status(200).json(data)
})

router.get('/voucher', async (req: any, res: any) => {
  const { user } = req
  const list = await prisma.voucher.findMany({
    where: {
      user_id: user?.id || '',
      status: 1,
    },
  })
  const data = list?.map((item) => {
    const newItem: any = item
    newItem.exp = moment(item.expired_at).format('YYYY-MM-DD HH:mm')
    return newItem
  })
  return res.status(200).json(data)
})

export default router
