import { PrismaClient } from '@prisma/client'
import express from 'express'
import { getMember, getServer, getUser } from '@src/_helper/function'
import { prismaX } from '@src/_helper/pagination'
import fs from 'fs'
import moment from 'moment-timezone'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

// Get Transaction
router.get('/', async (req: any, res: any) => {
  const server = getServer(req)
  const startDate = req?.query?.startDate
  const endDate = req?.query?.endDate
  const gte = moment(startDate).set({ hours: 0, minutes: 0, seconds: 0 }).toISOString()
  const lt = moment(endDate).set({ hours: 0, minutes: 0, seconds: 0 }).add(1, 'd').toISOString()
  try {
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const data = await prismaX.transaction_service.paginate({
      page,
      limit,
      where: {
        AND: [{ created_at: { gte } }, { created_at: { lt } }],
      },
      include: { class_store: { include: { class_gallery: true } }, class_schedule: true },
      orderBy: { updated_at: 'desc' },
    })
    const services = await prisma.service.findMany({ select: { id: true, name: true } })
    const mappedData = await Promise.all(
      data?.data?.map(async (item) => {
        const newItem = item
        if (item?.user_id) {
          newItem.user = await getUser(item?.user_id, req)
        }
        if (item?.service_id) {
          newItem.service_name =
            services?.find(({ id }) => id === item?.service_id)?.name || 'Gym Visit'
        }
        if (item?.class_store?.class_gallery?.length > 0) {
          const imageFileName = item?.class_store?.class_gallery?.[0]?.filename
          const imagePath = `public/images/class/${imageFileName}`
          if (fs.existsSync(imagePath)) {
            newItem.image = `${server}/static/images/class/${imageFileName}`
          }
        }
        return newItem
      })
    )
    data.data = mappedData
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Get Detail Transaction
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const data = await prisma.transaction_service.findUnique({
      where: { id },
      include: { class_store: { include: { class_gallery: true } }, class_schedule: true },
    })
    const services = await prisma.service.findMany({ select: { id: true, name: true } })
    const newData: any = data || {}
    if (data?.user_id) {
      newData.user = await getUser(data?.user_id, req)
      const member = await getMember(data?.user_id, req)
      newData.member = member?.member
      newData.membership = member?.membership
    }
    if (data?.service_id) {
      newData.service_name =
        services?.find(({ id }) => id === data?.service_id)?.name || 'Gym Visit'
    }
    if (data?.class_store && data?.class_store?.class_gallery?.length > 0) {
      const imageFileName = data?.class_store?.class_gallery?.[0]?.filename
      const imagePath = `public/images/class/${imageFileName}`
      if (fs.existsSync(imagePath)) {
        newData.image = `${server}/static/images/class/${imageFileName}`
      }
    }
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Delete Transaction
router.delete('/:id/delete', async (req: any, res: any) => {
  try {
    const { id } = req?.params
    const data = await prisma.transaction_service.delete({ where: { id } })
    return res.status(200).json({ status: 'success', message: 'Transaksi berhasil dihapus', data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
