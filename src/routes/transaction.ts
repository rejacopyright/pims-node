import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import { Encriptor } from '@src/_helper/encryptor'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.post('/visit', async (req: any, res: any) => {
  try {
    const { user } = req
    const {
      start_date,
      end_date,
      user_type,
      payment_id,
      service_id,
      product_fee,
      service_fee,
      app_fee,
      discount_fee,
      voucher_id,
      total_fee,
    } = req?.body || {}
    const data = await prisma.user.findFirst({ where: { id: user?.id } })
    const payment_method = await prisma.payment_method.findFirst({ where: { name: payment_id } })
    const encryptedUsername = Encriptor.encrypt(data?.username, 'RJ')
    // const decrypted = Encriptor.decrypt(encryptedUsername, 'RJ')

    const order_no = `VST${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
    const user_id = data?.id || ''
    const purchase_expired = moment()
      .set({ seconds: 0, milliseconds: 0 })
      .add({ minutes: payment_method?.deadline || 30 })
      .toISOString()

    prisma.$transaction(async () => {
      if (user_id) {
        const transaction = await prisma.transaction_service.create({
          data: {
            order_no,
            user_id,
            user_type,
            payment_id,
            service_id,
            purchase_expired,
            product_fee,
            service_fee,
            app_fee,
            discount_fee,
            voucher_id,
            total_fee,
            start_date: moment(start_date).toISOString(),
            end_date: moment(end_date).toISOString(),
          },
        })
        if (voucher_id) {
          await prisma.voucher.update({
            where: { id: voucher_id },
            data: { status: 2 },
          })
        }
        return res.status(200).json({
          status: 'success',
          data: transaction,
          message: 'Berhasil membuat reservasi Gym Visit',
        })
      } else {
        return res.status(400).json({ status: 'failed', message: 'User not found' })
      }
    })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
