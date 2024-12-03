import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment'
import fs from 'fs'
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

export const CreateClassValidator = z.object({
  service_id: z.number(),
  class_id: z.string({ required_error: 'Class is required' }),
  trainer_id: z.string({ required_error: 'Trainer is required' }),
  fee: z.number(),
  quota: z.number().nullish(),
  start_date: z.string(),
  end_date: z.string(),
})

// Create Class
router.post('/create', async (req: any, res: any) => {
  const { service_id, class_id, trainer_id, fee, quota, start_date, end_date } = req?.body

  try {
    const data = await prisma.class_schedule.create({
      data: CreateClassValidator.parse({
        service_id,
        class_id,
        trainer_id,
        fee: parseInt(fee || 0),
        quota: parseInt(quota || 0),
        start_date,
        end_date,
      }),
    })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dibuat', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
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
    const gte = moment(date).utc().toISOString()
    const lt = moment(date)
      .set({ hours: 0, minutes: 0, seconds: 0 })
      .add(1, 'd')
      .utc()
      .toISOString()
    const data = await prisma.class_schedule.findMany({
      where: { service_id: serviceObj[service], start_date: { gte, lt } },
      include: { class: true },
      orderBy: { start_date: 'desc' },
    })
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Class Detail
router.get('/:id/detail', async (req: any, res: any) => {
  try {
    const { id } = req?.params
    const data = await prisma.class_store.findUnique({
      where: { id: id },
      include: { class_gallery: true },
    })
    const newData: any = data || {}
    if (data?.default_trainer_id) {
      newData.default_trainer = await prisma.user.findUnique({
        where: { id: data?.default_trainer_id },
      })
    }
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Update Class
router.put('/:id/update', async (req: any, res: any) => {
  const { name, default_fee, default_trainer_id, gender, description } = req?.body
  const { id } = req?.params

  try {
    const data = await prisma.class_store.update({
      where: { id },
      data: CreateClassValidator.partial().parse({
        name,
        default_fee: parseInt(default_fee || 0),
        default_trainer_id,
        gender,
        description,
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
    const data = await prisma.class_store.delete({ where: { id } })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dihapus', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
