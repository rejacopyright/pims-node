import { PrismaClient } from '@prisma/client'
import express from 'express'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import has from 'lodash/has'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

// Get Detail Config
router.get('/detail', async (req: any, res: any) => {
  try {
    const data = await prisma.config.findFirst({ where: { id: 1 } })
    const newData: any = data || {}
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Update Config
router.put('/update', async (req: any, res: any) => {
  const body = req?.body || {}
  const {
    voucher_new_user_type,
    voucher_new_user_value,
    days_future,
    qr_time_validity,
    cancel_booking_time,
    visit_time_interval,
    visit_fee,
    service_fee,
    app_fee,
  } = body
  const { id } = req?.params

  const requestBody: any = {}
  if (has(body, 'voucher_new_user_type')) {
    requestBody.voucher_new_user_type = voucher_new_user_type ? parseInt(voucher_new_user_type) : 1
  }
  if (has(body, 'voucher_new_user_value')) {
    requestBody.voucher_new_user_value = voucher_new_user_value
      ? parseInt(voucher_new_user_value)
      : 0
  }
  if (has(body, 'days_future')) {
    requestBody.days_future = days_future ? parseInt(days_future) : 30
  }
  if (has(body, 'qr_time_validity')) {
    requestBody.qr_time_validity = qr_time_validity ? parseInt(qr_time_validity) : 15
  }
  if (has(body, 'cancel_booking_time')) {
    requestBody.cancel_booking_time = cancel_booking_time ? parseInt(cancel_booking_time) : 15
  }
  if (has(body, 'visit_time_interval')) {
    requestBody.visit_time_interval = visit_time_interval ? parseInt(visit_time_interval) : 30
  }
  if (has(body, 'visit_fee')) {
    requestBody.visit_fee = visit_fee ? parseInt(visit_fee) : 0
  }
  if (has(body, 'service_fee')) {
    requestBody.service_fee = service_fee ? parseInt(service_fee) : 0
  }
  if (has(body, 'app_fee')) {
    requestBody.app_fee = app_fee ? parseInt(app_fee) : 0
  }

  try {
    const data = await prisma.config.update({ where: { id: 1 }, data: requestBody })
    return res
      .status(200)
      .json({ status: 'success', message: 'Configuration successfully updated', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
