import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import { Encriptor } from '@src/_helper/encryptor'
import { coreApi, createTransaction } from '@src/_helper/midtrans'
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
        const payment = await createTransaction({
          order_no,
          type: 'visit',
          product_name: 'Gym Visit',
          requestBody: req?.body || {},
          user: data,
        })
        const transaction = await prisma.transaction_service.create({
          data: {
            order_no,
            user_id,
            user_type,
            payment_id,
            payment,
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

router.post('/class', async (req: any, res: any) => {
  try {
    const { user } = req
    const {
      class_schedule_id,
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
    const userDetail = await prisma.user.findFirst({ where: { id: user?.id } })
    const class_schedule = await prisma.class_schedule.findUnique({
      where: { id: class_schedule_id },
      include: { class: true },
    })
    const classStore = class_schedule?.class
    const classType =
      classStore?.service_id === 2
        ? 'Kelas Studio'
        : classStore?.service_id === 3
          ? 'Kelas Fungsional'
          : 'Kelas Studio'
    const payment_method = await prisma.payment_method.findFirst({ where: { name: payment_id } })
    const encryptedUsername = Encriptor.encrypt(userDetail?.username, 'RJ')
    // const decrypted = Encriptor.decrypt(encryptedUsername, 'RJ')

    const order_no = `${service_id === 2 ? 'STD' : 'FS'}${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
    const user_id = userDetail?.id || ''
    const purchase_expired = moment()
      .set({ seconds: 0, milliseconds: 0 })
      .add({ minutes: payment_method?.deadline || 30 })
      .toISOString()

    prisma.$transaction(async () => {
      if (user_id) {
        const payment = await createTransaction({
          order_no,
          type: 'order',
          product_name: `${classStore?.name || ''} (${classType})`,
          requestBody: req?.body || {},
          user: userDetail,
        })
        const transaction = await prisma.transaction_service.create({
          data: {
            order_no,
            class_schedule_id,
            user_id,
            user_type,
            payment_id,
            payment,
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
          message: 'Berhasil membuat reservasi Kelas',
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
