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
    if (['order', 'visit'].includes(body?.metadata?.type) || !body?.order_id?.startsWith('MB')) {
      const config = await prisma.config.findFirst()
      const thisTransaction = await prisma.transaction_service.findFirst({
        where: { order_no: body?.order_id },
      })
      if (body?.transaction_status === 'settlement') {
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
      } else if (body?.transaction_status === 'expire') {
        const transaction = await prisma.transaction_service.updateMany({
          where: { order_no: body?.order_id },
          data: {
            status: 4,
            canceled_at: moment().toISOString(),
            canceled_by: 1,
            cancel_reason: 'Gymers tidak membayar booking melebihi batas akhir pembayaran',
          },
        })
        return res
          .status(200)
          .json({ status: 'success', message: 'Transaction expired', data: transaction })
      } else {
        return res.status(200).json({ status: body?.transaction_status })
      }
    } else if (['member'].includes(body?.metadata?.type) || body?.order_id?.startsWith('MB')) {
      const purchased_at = moment(body?.settlement_time)
      const thisTransaction = await prisma.member_transaction.findFirst({
        where: { order_no: body?.order_id },
      })
      if (body?.transaction_status === 'settlement') {
        await prisma.member_transaction.updateMany({
          where: {
            user_id: thisTransaction?.user_id,
            status: 2,
            NOT: [{ order_no: body?.order_id }],
          },
          data: {
            status: 4,
            canceled_at: moment().toISOString(),
            canceled_by: 2,
            cancel_reason: 'Membership changed by User',
          },
        })
        const transaction = await prisma.member_transaction.update({
          where: { order_no: body?.order_id },
          data: {
            payment: body,
            purchased_at: purchased_at.toISOString(),
            status: 2,
            start_date: purchased_at.toISOString(),
            end_date: purchased_at.add({ days: thisTransaction?.duration || 30 }).toISOString(),
          },
        })

        if (thisTransaction?.user_id) {
          await prisma.user.update({
            where: { id: thisTransaction?.user_id },
            data: { role_id: 2 },
          })
        }
        return res
          .status(200)
          .json({ status: 'success', message: 'Payment success', data: transaction })
      } else if (body?.transaction_status === 'expire') {
        const transaction = await prisma.member_transaction.delete({
          where: { order_no: body?.order_id },
        })
        return res
          .status(200)
          .json({ status: 'success', message: 'Transaction expired', data: transaction })
      } else {
        return res.status(200).json({ status: body?.transaction_status })
      }
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
