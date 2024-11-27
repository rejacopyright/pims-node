import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment'
import { Encriptor } from '@src/_helper/encryptor'
import { paginate } from '@src/_helper/pagination'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/:status(unpaid|active|done|cancel)', async (req: any, res: any) => {
  try {
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const { user } = req
    const { status } = req?.params
    const statusObj = { unpaid: 1, active: 2, done: 3, cancel: 4 }
    await prisma.transaction_service.updateMany({
      where: { user_id: user?.id, status: 1, purchase_expired: { lt: moment().toISOString() } },
      data: {
        status: 4,
        canceled_at: moment().toISOString(),
        canceled_by: 1,
        cancel_reason: 'Gymers tidak membayar booking melebihi batas akhir pembayaran',
      },
    })
    const data = await paginate('transaction_service', {
      page,
      limit,
      where: { user_id: user?.id, status: statusObj[status] },
      orderBy: { updated_at: 'desc' },
    })
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Order Detail
router.get('/:id/detail', async (req: any, res: any) => {
  try {
    const { id } = req?.params
    const data = await prisma.transaction_service.findUnique({
      where: { id: id },
    })
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
