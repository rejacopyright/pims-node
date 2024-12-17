import { PrismaClient } from '@prisma/client'
import express from 'express'
import { prismaX } from '@helper/pagination'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
import { getServer } from '@src/_helper/function'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

export const CreateMemberItemValidator = z.object({
  member_id: z.string({ required_error: 'Member is required' }),
  service_id: z.number({ required_error: 'Service is required' }),
  class_id: z.string({ required_error: 'Class is required' }).nullish(),
})

// Get Member Item List
router.get('/:member_id', async (req: any, res: any) => {
  const { member_id } = req?.params
  try {
    const q = req?.query?.q || ''
    const class_ids = (
      await prisma.class_store.findMany({
        where: { name: { contains: q?.toString(), mode: 'insensitive' } },
        select: { id: true },
      })
    )?.map(({ id }) => id)
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const data = await prismaX.member_items.paginate({
      page,
      limit,
      where: {
        member_id,
        OR: [{ class_id: { in: class_ids } }, { service_id: 1 }],
        // OR: [
        //   // { name: { contains: q?.toString(), mode: 'insensitive' } },
        //   // { description: { contains: q?.toString(), mode: 'insensitive' } },
        // ],
      },
      include: { member: true },
      orderBy: { updated_at: 'desc' },
    })
    data.data = await Promise.all(
      data?.data?.map(async (item) => {
        const newItem = item
        if (item?.class_id) {
          newItem.class = await prisma.class_store.findUnique({
            where: { id: item?.class_id },
            include: { class_gallery: true },
          })
        }
        newItem.visit_fee = (await prisma.config.findFirst())?.visit_fee
        return newItem
      })
    )
    const hasVisit = (await prisma.member_items.count({ where: { service_id: 1, member_id } })) > 0
    return res.status(200).json({ hasVisit, ...data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Get Detail Member Item
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const data = await prisma.member_items.findUnique({
      where: { id },
      include: { member: true },
    })
    const newData: any = data || {}
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Create Member Item
router.post('/create', async (req: any, res: any) => {
  const { member_id, service_id, class_id, fee, quota } = req?.body

  if (service_id !== 1 && !class_id) {
    return res.status(400).json({ status: 'failed', message: 'Kelas harus diisi' })
  }

  const isExistClass = await prisma.member_items.findFirst({ where: { member_id, class_id } })
  if (service_id !== 1 && isExistClass) {
    return res.status(400).json({ status: 'failed', message: 'Kelas sudah ada' })
  }

  const isExistVisit = await prisma.member_items.findFirst({ where: { member_id, service_id: 1 } })
  if (service_id === 1 && isExistVisit) {
    return res.status(400).json({ status: 'failed', message: 'Gym Visit sudah dimasukan' })
  }

  try {
    const data = await prisma.member_items.create({
      data: CreateMemberItemValidator.passthrough().parse({
        member_id,
        service_id,
        class_id,
        fee: fee ? parseInt(fee) : null,
        quota: quota ? parseInt(quota) : null,
      }),
    })

    return res
      .status(200)
      .json({ status: 'success', message: 'Member Item successfully created', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Update Member Item
router.put('/:id/update', async (req: any, res: any) => {
  const { fee, quota } = req?.body
  const { id } = req?.params

  try {
    const data = await prisma.member_items.update({
      where: { id },
      data: CreateMemberItemValidator.partial()
        .passthrough()
        .parse({
          fee: fee ? parseInt(fee) : null,
          quota: quota ? parseInt(quota) : null,
        }),
    })

    return res
      .status(200)
      .json({ status: 'success', message: 'Member Item successfully changed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Delete Member Item
router.delete('/:id/delete', async (req: any, res: any) => {
  const { id } = req?.params

  try {
    const data = await prisma.member_items.delete({ where: { id } })
    return res
      .status(200)
      .json({ status: 'success', message: 'Member Item successfully removed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
