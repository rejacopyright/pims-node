import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import { Encriptor } from '@src/_helper/encryptor'
import { coreApi, createTransaction, createTransactionType } from '@src/_helper/midtrans'
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
      status,
    } = req?.body || {}
    const isRegular = payment_id && total_fee > 0
    const isMember = !payment_id && total_fee === 0
    const data = await prisma.user.findFirst({ where: { id: user?.id } })
    const payment_method = isRegular
      ? await prisma.payment_method.findFirst({ where: { name: payment_id } })
      : null
    const encryptedUsername = Encriptor.encrypt(data?.username?.toUpperCase(), 'RJ')
    // const decrypted = Encriptor.decrypt(encryptedUsername, 'RJ')

    const order_no = `VST${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
    const user_id = data?.id || ''
    const purchase_expired = isRegular
      ? moment()
          .set({ seconds: 0, milliseconds: 0 })
          .add({ minutes: payment_method?.deadline || 30 })
          .toISOString()
      : null

    prisma.$transaction(async () => {
      if (user_id) {
        let payment: any = {}
        if (isRegular) {
          payment = await createTransaction({
            order_no,
            type: 'visit',
            product_name: 'Gym Visit',
            requestBody: req?.body || {},
            user: data,
          })
        }
        const config = await prisma.config.findFirst()
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
            status,
            ...(isMember
              ? {
                  valid_from: moment(start_date)
                    .subtract({ minutes: config?.qr_time_validity || 15 })
                    .toISOString(),
                  valid_to: moment(end_date)
                    .subtract({ minutes: config?.qr_time_validity || 15 })
                    .toISOString(),
                  cancelable_until: moment(start_date)
                    .subtract({ minutes: config?.cancel_booking_time || 15 })
                    .toISOString(),
                }
              : {}),
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
      status,
    } = req?.body || {}
    const isRegular = payment_id && total_fee > 0
    const isMember = !payment_id && total_fee === 0

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
    const payment_method = isRegular
      ? await prisma.payment_method.findFirst({ where: { name: payment_id } })
      : null
    const encryptedUsername = Encriptor.encrypt(userDetail?.username?.toUpperCase(), 'RJ')
    // const decrypted = Encriptor.decrypt(encryptedUsername, 'RJ')

    const order_no = `${service_id === 2 ? 'STD' : 'FS'}${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
    const user_id = userDetail?.id || ''
    const purchase_expired = isRegular
      ? moment()
          .set({ seconds: 0, milliseconds: 0 })
          .add({ minutes: payment_method?.deadline || 30 })
          .toISOString()
      : null

    prisma.$transaction(async () => {
      if (user_id) {
        let payment: any = {}
        if (isRegular) {
          payment = await createTransaction({
            order_no,
            type: 'order',
            product_name: `${classStore?.name || ''} (${classType})`,
            requestBody: req?.body || {},
            user: userDetail,
          })
        }
        const config = await prisma.config.findFirst()
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
            status,
            ...(isMember
              ? {
                  valid_from: moment(start_date)
                    .subtract({ minutes: config?.qr_time_validity || 15 })
                    .toISOString(),
                  valid_to: moment(end_date)
                    .subtract({ minutes: config?.qr_time_validity || 15 })
                    .toISOString(),
                  cancelable_until: moment(start_date)
                    .subtract({ minutes: config?.cancel_booking_time || 15 })
                    .toISOString(),
                }
              : {}),
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

router.post('/member', async (req: any, res: any) => {
  try {
    const { user } = req
    const { member_id, payment_id, total_fee, duration } = req?.body || {}
    const userDetail = await prisma.user.findFirst({ where: { id: user?.id } })
    const encryptedUsername = Encriptor.encrypt(userDetail?.username?.toUpperCase(), 'RJ')
    // const decrypted = Encriptor.decrypt(encryptedUsername, 'RJ')

    const order_no = `MB${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
    const user_id = userDetail?.id || ''

    prisma.$transaction(async () => {
      const custom_expiry: createTransactionType['custom_expiry'] = {
        expiry_duration: 1,
        unit: 'day',
      }
      if (user_id) {
        const payment = await createTransaction({
          order_no,
          type: 'member',
          product_name: `Member`,
          requestBody: req?.body || {},
          user: userDetail,
          custom_expiry: custom_expiry,
        })
        const purchase_expired = moment()
          .add({ [custom_expiry.unit]: custom_expiry.expiry_duration })
          .toISOString()
        const transaction = await prisma.member_transaction.create({
          data: {
            order_no,
            member_id,
            user_id,
            payment_id,
            payment,
            purchase_expired,
            fee: total_fee,
            duration,
          },
        })
        return res.status(200).json({
          status: 'success',
          data: transaction,
          message: 'Permintaan member berhasil dibuat',
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
