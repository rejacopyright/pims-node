import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
    transaction_service: {
      deleted: true,
    },
  },
})

router.post('/midtrans/callback', async (req: any, res: any) => {
  const body = req.body

  try {
    if (
      ['order', 'visit'].includes(body?.metadata?.type) &&
      body?.transaction_status === 'settlement'
    ) {
      const config = await prisma.config.findFirst()
      const thisTransaction = await prisma.transaction_service.findFirst({
        where: { order_no: body?.order_id },
      })
      const transaction = await prisma.transaction_service.update({
        where: { order_no: body?.order_id },
        data: {
          payment: body,
          purchased_at: moment(body?.settlement_time).toISOString(),
          valid_from: moment(thisTransaction?.start_date)
            .subtract({ minutes: config?.qr_time_validity || 15 })
            .toISOString(),
          valid_to: moment(thisTransaction?.end_date)
            .subtract({ minutes: config?.qr_time_validity || 15 })
            .toISOString(),
          status: 2,
          cancelable_until: moment(thisTransaction?.start_date)
            .subtract({ minutes: config?.cancel_booking_time || 15 })
            .toISOString(),
        },
      })

      return res
        .status(200)
        .json({ status: 'success', message: 'Payment success', data: transaction })
    } else {
      return res.status(200).json({ status: 'pending', message: 'Pending', data: body })
    }
  } catch (error) {
    return res.status(400).json({ status: 'failed', message: error, data: body })
  }
})

router.post('/midtrans/recurring', async (req: any, res: any) => {
  return res.status(200).json({ message: 'midtrans recurring' })
})

router.post('/midtrans/pay', async (req: any, res: any) => {
  return res.status(200).json({ message: 'midtrans pay' })
})

export default router
