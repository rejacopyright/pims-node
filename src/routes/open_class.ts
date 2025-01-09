import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
import fs from 'fs'
import { getServer, getUser } from '@src/_helper/function'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

export const CreateClassValidator = z.object({
  service_id: z.number(),
  class_id: z.string({ required_error: 'Class is required' }),
  trainer_id: z.string({ required_error: 'Trainer is required' }),
  fee: z.number(),
  quota: z.number().nullish(),
  session: z.number(),
  start_date: z.string(),
  end_date: z.string(),
})

// Create Class
router.post('/create', async (req: any, res: any) => {
  const { service_id, class_id, trainer_id, fee, quota, start_date, end_date, session } = req?.body

  try {
    const isExist = await prisma.class_schedule.findFirst({ where: { start_date } })
    if (isExist) {
      return res.status(400).json({ status: 'failed', message: 'Jadwal sudah di booking' })
    }
    const data = await prisma.class_schedule.create({
      data: CreateClassValidator.parse({
        service_id,
        class_id,
        trainer_id,
        fee: parseInt(fee || 0),
        quota: parseInt(quota || 0),
        session: parseInt(session || 1),
        start_date,
        end_date,
      }),
    })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dibuat', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors, err })
  }
})

// Get Class List
router.get('/:service(studio|functional)', async (req: any, res: any) => {
  try {
    const q = req?.query?.q || ''
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const { service } = req?.params
    const serviceObj = { studio: 2, functional: 3 }
    const date = req?.query?.date
    const gt = moment(date)
      // .utc(date)
      // .local()
      // .utc()
      .toISOString()
    const lt = moment(date)
      // .utc(date)
      // .set({ hours: 0, minutes: 0, seconds: 0 })
      .add(1, 'd')
      // .local()
      // .utc()
      .toISOString()
    const data = await prisma.class_schedule.findMany({
      // where: { service_id: serviceObj[service], start_date: { gte, lt } },
      where: {
        AND: [
          { service_id: serviceObj[service] },
          { start_date: { gt: moment().toISOString() } },
          { start_date: { gt } },
          { start_date: { lt } },
        ],
        // OR: [{ start_date: { gte } }, { start_date: { lt } }],
      },
      include: { class: { include: { class_gallery: true } } },
      orderBy: { start_date: 'desc' },
    })
    const mappedData = await Promise.all(
      data?.map(async (item) => {
        const newItem: any = item
        const transaction = await prisma.transaction_service.findMany({
          where: { class_schedule_id: item?.id, status: 2 },
        })
        newItem.transaction = await Promise.all(
          transaction?.map(async (trx) => {
            const newTrx: any = trx
            if (trx?.user_id) {
              newTrx.user = await getUser(trx?.user_id, req)
            }
            return newTrx
          })
        )
        if (item?.trainer_id) {
          const trainer = await prisma.user.findUnique({ where: { id: item?.trainer_id } })
          newItem.trainer = trainer
          if (trainer?.id) {
            newItem.trainer.full_name = `${trainer?.first_name} ${trainer?.last_name}`
          }
        }
        return newItem
      })
    )
    return res.status(200).json({ data: mappedData })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Class Detail
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const auth = req?.user

    const data = await prisma.class_schedule.findUnique({
      where: { id },
      include: { class: { include: { class_gallery: true } } },
    })

    // FOR MEMBERSHIP
    const membership = await prisma.member_transaction.findFirst({
      where: { user_id: auth?.id, status: 2, end_date: { gte: moment().toISOString() } },
    })
    let member_class: any = null
    if (membership?.member_id) {
      member_class = await prisma.member_items.findFirst({
        where: { member_id: membership?.member_id, class_id: data?.class_id },
      })
    }

    const mappedData: any = data
    if (data?.trainer_id) {
      const trainer = await getUser(data?.trainer_id, req)
      mappedData.trainer = trainer
    }
    const transaction = await prisma.transaction_service.findMany({
      where: { class_schedule_id: data?.id, status: 2 },
    })
    mappedData.transaction = await Promise.all(
      transaction?.map(async (trx) => {
        const newTrx: any = trx
        if (trx?.user_id) {
          newTrx.user = await getUser(trx?.user_id, req)
        }
        return newTrx
      })
    )
    return res
      .status(200)
      .json({ isMember: Boolean(membership?.member_id), member_class, ...mappedData })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Update Class
router.put('/:id/update', async (req: any, res: any) => {
  const { class_id, trainer_id, fee, quota, session, end_date } = req?.body
  const { id } = req?.params

  try {
    const data = await prisma.class_schedule.update({
      where: { id },
      data: CreateClassValidator.partial().parse({
        class_id,
        trainer_id,
        fee: parseInt(fee || 0),
        quota: parseInt(quota || 0),
        session: parseInt(session || 1),
        end_date,
      }),
    })

    return res.status(200).json({ status: 'success', message: 'Kelas berhasil diubah', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Delete Class
router.delete('/:id/delete', async (req: any, res: any) => {
  const { id } = req?.params

  try {
    const data = await prisma.class_schedule.delete({ where: { id } })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dihapus', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
