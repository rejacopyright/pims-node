import { PrismaClient } from '@prisma/client'
import express from 'express'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import has from 'lodash/has'
import { z } from 'zod'
import fs from 'fs'
import moment from 'moment-timezone'
import { getServer } from '@src/_helper/function'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

export const CreateAppBannerValidator = z.object({
  index: z.number({ required_error: 'Index is required' }).min(1, 'Index at least 1'),
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

// ======================== APP BANNER ========================

// Get App Banner
router.get('/app/banner', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const data = await prisma.app_banner.findMany({ orderBy: { index: 'asc' } })
    const mappedData = data?.map((item) => {
      const newItem = item
      const image = `public/images/app_banner/${item?.image}`
      const image_link =
        item?.image && fs.existsSync(image)
          ? `${server}/static/images/app_banner/${item?.image}`
          : null
      newItem.image = image_link
      return newItem
    })
    return res.status(200).json({ data: mappedData })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Create App Banner
router.post('/app/banner/create', async (req: any, res: any) => {
  const { index, title, sub_title, image } = req?.body

  try {
    const checkDuplicateIndex = await prisma.app_banner.findUnique({ where: { index } })
    if (checkDuplicateIndex) {
      return res.status(400).json({ status: 'failed', message: `Index ${index} sudah ada` })
    }

    let filename
    if (image) {
      const dir = 'public/images/app_banner'
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      const base64 = image?.split(',')
      const base64Ext = base64?.[0]?.toLowerCase()
      const base64Data = base64?.[1]
      let ext = 'png'
      // var base64_buffer = Buffer.from(base64, 'base64')
      if (base64Ext?.indexOf('jpeg') !== -1) {
        ext = 'jpg'
      }

      filename = `${moment().format('YYYYMMDDHHmmss')}.${ext}`
      fs.writeFile(`${dir}/${filename}`, base64Data, 'base64', () => '')
    }

    const data = await prisma.app_banner.create({
      data: CreateAppBannerValidator.passthrough().parse({
        index,
        title,
        sub_title,
        image: filename,
      }),
    })

    return res
      .status(200)
      .json({ status: 'success', message: 'App Banner successfully created', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Update App Banner
router.put('/app/banner/:id/update', async (req: any, res: any) => {
  const { index, title, sub_title, image, isImageChanged } = req?.body
  const { id } = req?.params

  try {
    const checkDuplicateIndex = await prisma.app_banner.findUnique({
      where: { index, NOT: { id } },
    })
    if (checkDuplicateIndex) {
      return res.status(400).json({ status: 'failed', message: `Index ${index} sudah ada` })
    }

    let filename
    if (isImageChanged) {
      const dir = 'public/images/app_banner'
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      const thisAppBanner = await prisma.app_banner.findUnique({ where: { id } })
      if (thisAppBanner?.image) {
        const filename = `${dir}/${thisAppBanner?.image}`
        if (fs.existsSync(filename)) {
          fs.unlink(filename, () => '')
        }
      }
      if (image) {
        const base64 = image?.split(',')
        const base64Ext = base64?.[0]?.toLowerCase()
        const base64Data = base64?.[1]
        let ext = 'png'
        // var base64_buffer = Buffer.from(base64, 'base64')
        if (base64Ext?.indexOf('jpeg') !== -1) {
          ext = 'jpg'
        }

        filename = `${moment().format('YYYYMMDDHHmmss')}.${ext}`
        fs.writeFile(`${dir}/${filename}`, base64Data, 'base64', () => '')
      } else {
        filename = null
      }
    }

    const data = await prisma.app_banner.update({
      where: { id },
      data: CreateAppBannerValidator.partial().passthrough().parse({
        index,
        title,
        sub_title,
        image: filename,
      }),
    })

    return res
      .status(200)
      .json({ status: 'success', message: 'App Banner successfully changed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Delete App Banner
router.delete('/app/banner/:id/delete', async (req: any, res: any) => {
  const { id } = req?.params

  try {
    const dir = 'public/images/app_banner'
    const thisAppBanner = await prisma.app_banner.findUnique({ where: { id } })
    if (thisAppBanner?.image) {
      const filename = `${dir}/${thisAppBanner?.image}`
      if (fs.existsSync(filename)) {
        fs.unlink(filename, () => '')
      }
    }
    const data = await prisma.app_banner.delete({ where: { id } })
    return res
      .status(200)
      .json({ status: 'success', message: 'App Banner successfully removed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
