import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import { Encriptor } from '@src/_helper/encryptor'
import { paginate, prismaX } from '@src/_helper/pagination'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

export const CancelOrderValidator = z.object({
  status: z.number(),
  canceled_at: z.string(),
  canceled_by: z.number({ required_error: 'Canceler is required' }),
  cancel_reason: z.string({ required_error: 'Alasan pembatalan wajib diisi' }).max(200),
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
    const data = await prismaX.transaction_service.paginate({
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

router.post('/:id/cancel', async (req: any, res: any) => {
  try {
    const { id } = req?.params
    const { canceled_by, cancel_reason } = req?.body
    const data = await prisma.transaction_service.update({
      where: { id: id },
      data: CancelOrderValidator.partial().parse({
        status: 4,
        canceled_at: moment().toISOString(),
        canceled_by: canceled_by,
        cancel_reason: cancel_reason,
      }),
    })
    return res.status(200).json({ status: 'success', message: 'Order berhasil dibatalkan', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
