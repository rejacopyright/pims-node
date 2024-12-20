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
    if (status === 'unpaid') {
      await prisma.transaction_service.updateMany({
        where: { user_id: user?.id, status: 1, purchase_expired: { lt: moment().toISOString() } },
        data: {
          status: 4,
          canceled_at: moment().toISOString(),
          canceled_by: 1,
          cancel_reason: 'Gymers tidak membayar booking melebihi batas akhir pembayaran',
        },
      })
    }
    if (status === 'active') {
      await prisma.transaction_service.updateMany({
        where: { user_id: user?.id, status: 2, valid_to: { lte: moment().toISOString() } },
        data: { status: 3 },
      })
    }
    const data = await prismaX.transaction_service.paginate({
      page,
      limit,
      where: { user_id: user?.id, status: statusObj[status] },
      orderBy: { updated_at: 'desc' },
    })
    try {
      const mappedData = await Promise.all(
        data?.data?.map(async (item) => {
          const newItem = item
          if (item?.class_schedule_id) {
            newItem.class_schedule = await prisma.class_schedule.findUnique({
              where: { id: item?.class_schedule_id },
              include: { class: { include: { class_gallery: true } } },
            })
            const trainer = await prisma.user.findUnique({
              where: { id: newItem?.class_schedule?.trainer_id },
            })
            newItem.class_schedule.trainer = trainer
            if (trainer?.id) {
              newItem.class_schedule.trainer.full_name = `${trainer?.first_name} ${trainer?.last_name}`
            }
          }
          return newItem
        })
      )
      data.data = mappedData
    } catch (error) {
      //
    }
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
    const newData: any = data
    if (data?.class_schedule_id) {
      newData.class_schedule = await prisma.class_schedule.findUnique({
        where: { id: data?.class_schedule_id },
        include: { class: { include: { class_gallery: true } } },
      })
      if (newData?.class_schedule?.trainer_id) {
        const trainer = await prisma.user.findUnique({
          where: { id: newData?.class_schedule?.trainer_id },
        })
        newData.class_schedule.trainer = trainer
        if (trainer?.id) {
          newData.class_schedule.trainer.full_name = `${trainer?.first_name} ${trainer?.last_name}`
        }
      }
    }
    return res.status(200).json(newData)
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

// Check Membership Visit
router.get('/check/member/visit', async (req: any, res: any) => {
  try {
    const auth = req?.user
    const membership = await prisma.member_transaction.findFirst({
      where: { user_id: auth?.id, status: 2, end_date: { gte: moment().toISOString() } },
    })
    let visit: any = null
    if (membership?.member_id) {
      visit = await prisma.member_items.findFirst({
        where: { member_id: membership?.member_id, service_id: 1 },
      })
    }
    return res.status(200).json({ isMember: Boolean(membership?.member_id), visit })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
