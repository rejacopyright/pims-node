import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import fs from 'fs'
import { Encriptor } from '@src/_helper/encryptor'
import { prismaX } from '@src/_helper/pagination'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
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
  service_id: z.number({ required_error: 'Service ID is required' }),
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name is required'),
  default_fee: z.number().optional().nullable(),
  default_trainer_id: z.string().optional(),
  gender: z.number().optional(),
  description: z.string().optional(),
})
export const CreateGalleryClassValidator = z.object({
  class_id: z.string({ required_error: 'Class ID is required' }),
  index: z.number().optional(),
  filename: z.string({ required_error: 'Name is required' }),
  type: z.number().optional(),
  name: z.string().optional(),
})

// Create Class
router.post('/create', async (req: any, res: any) => {
  const { service_id, name, default_fee, default_trainer_id, gender, description } = req?.body

  try {
    const data = await prisma.class_store.create({
      data: CreateClassValidator.parse({
        service_id,
        name,
        default_fee: parseInt(default_fee || 0),
        default_trainer_id,
        gender,
        description,
      }),
    })
    const dir = 'public/images/class'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    req.body?.images?.map(async (item, index: number) => {
      const base64 = item?.img?.split(',')
      const base64Ext = base64?.[0]?.toLowerCase()
      const base64Data = base64?.[1]
      let ext = 'png'
      let type = 1
      // var base64_buffer = Buffer.from(base64, 'base64')
      if (base64Ext?.indexOf('jpeg') !== -1) {
        ext = 'jpg'
      }
      const filename = `${service_id}_${moment().format('YYYYMMDDHHmmss')}_${index + 1}.${ext}`

      await prisma.class_gallery.create({
        data: CreateGalleryClassValidator.parse({
          class_id: data.id,
          index: item?.index,
          filename,
          type,
          name: data?.name,
        }),
      })
      fs.writeFile(`${dir}/${filename}`, base64Data, 'base64', () => '')
    })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dibuat', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Get Class List All
router.get('/', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const q = req?.query?.q || ''
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10

    const service = req?.query?.service
    const serviceObj = { studio: 2, functional: 3 }
    const data = await prismaX.class_store.paginate({
      page,
      limit,
      where: {
        AND: [service ? { service_id: serviceObj[service] } : {}],
        OR: [
          {
            name: { contains: q?.toString(), mode: 'insensitive' },
          },
        ],
      },
      include: { class_gallery: true },
      orderBy: { updated_at: 'desc' },
    })
    const mappedData = await Promise.all(
      data?.data?.map(async (item) => {
        const newItem = item
        let image: any = null
        if (item?.class_gallery?.length > 0) {
          const imagePath = `public/images/class/${item?.class_gallery?.[0]?.filename}`
          if (fs.existsSync(imagePath)) {
            image = `${server}/static/images/class/${item?.class_gallery?.[0]?.filename}`
          }
        }
        newItem.image = image

        if (item?.service_id) {
          newItem.service_name = (
            await prisma.service.findUnique({ where: { id: item?.service_id } })
          )?.name?.replace('Kelas ', '')
        }

        if (item?.default_trainer_id) {
          newItem.trainer = await getUser(item?.default_trainer_id, req)
        }
        return item
      })
    )
    data.data = mappedData
    return res.status(200).json({ ...data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Get Top Class
router.get('/top', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const data = await prisma.class_store.findMany({
      where: { NOT: { service_id: 1 } },
      include: {
        class_gallery: true,
        _count: { select: { transaction_service: { where: { status: { in: [2, 3] } } } } },
      },
      orderBy: { transaction_service: { _count: 'desc' } },
      take: 5,
    })
    const mappedData = await Promise.all(
      data?.map(async (item) => {
        const newItem: any = item
        let image: any = null
        if (item?.class_gallery?.length > 0) {
          const imagePath = `public/images/class/${item?.class_gallery?.[0]?.filename}`
          if (fs.existsSync(imagePath)) {
            image = `${server}/static/images/class/${item?.class_gallery?.[0]?.filename}`
          }
          newItem.image = image
        }

        if (item?.service_id) {
          newItem.service_name = (
            await prisma.service.findUnique({ where: { id: item?.service_id } })
          )?.name?.replace('Kelas ', '')
        }

        if (item?.default_trainer_id) {
          newItem.default_trainer = await getUser(item?.default_trainer_id, req)
        }

        return newItem
      })
    )
    return res.status(200).json({ data: mappedData })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Get Class List By Service
router.get('/:service(studio|functional)', async (req: any, res: any) => {
  try {
    const q = req?.query?.q || ''
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10

    const member_id = req?.query?.member_id || null
    let class_ids: any = []
    if (member_id) {
      class_ids = await prisma.member_items.findMany({
        where: { member_id },
        select: { class_id: true },
      })
    }
    const { service } = req?.params
    const serviceObj = { studio: 2, functional: 3 }
    const data = await prismaX.class_store.paginate({
      page,
      limit,
      where: {
        service_id: serviceObj[service],
        id: { notIn: class_ids?.map(({ class_id }) => class_id)?.filter((f) => f) },
        OR: [
          {
            name: { contains: q?.toString(), mode: 'insensitive' },
          },
        ],
      },
      include: { class_gallery: true },
      orderBy: { updated_at: 'desc' },
    })
    return res.status(200).json({ ...data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Class Detail
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const data = await prisma.class_store.findUnique({
      where: { id: id },
      include: { class_gallery: true },
    })
    const newData: any = data || {}

    // OPEN CLASS
    let open_class = await prisma.class_schedule.findMany({
      where: {
        class_id: data?.id,
        start_date: { gt: moment().toISOString() },
      },
      orderBy: { start_date: 'asc' },
    })
    open_class = await Promise.all(
      open_class?.map(async (item) => {
        const newItem: any = item || {}
        let trainer = null
        if (item?.trainer_id) {
          trainer = await getUser(item?.trainer_id, req)
        }
        newItem.trainer = trainer
        return newItem
      })
    )
    newData.open_class = open_class

    // TRAINER
    if (data?.default_trainer_id) {
      newData.trainer = await getUser(data?.default_trainer_id, req)
    }
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Update Class
router.put('/:id/update', async (req: any, res: any) => {
  const {
    service_id,
    name,
    default_fee,
    default_trainer_id,
    gender,
    description,
    images,
    isImageChanged,
  } = req?.body
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

    if (isImageChanged) {
      const dir = 'public/images/class'
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      const thisClass = await prisma.class_store.findUnique({
        where: { id },
        include: { class_gallery: true },
      })
      const class_gallery = thisClass?.class_gallery
      if (class_gallery && class_gallery?.length > 0) {
        class_gallery?.map((item) => {
          const dir = 'public/images/class'
          const filename = `${dir}/${item?.filename}`
          if (fs.existsSync(filename)) {
            fs.unlink(filename, () => '')
          }
        })
        await prisma.class_gallery.deleteMany({
          where: { id: { in: class_gallery?.map((item) => item?.id) } },
        })
      }
      if (images?.length) {
        images?.map(async (item, index: number) => {
          const base64 = item?.img?.split(',')
          const base64Ext = base64?.[0]?.toLowerCase()
          const base64Data = base64?.[1]
          let ext = 'png'
          let type = 1
          // var base64_buffer = Buffer.from(base64, 'base64')
          if (base64Ext?.indexOf('jpeg') !== -1) {
            ext = 'jpg'
          }
          const filename = `${service_id}_${moment().format('YYYYMMDDHHmmss')}_${index + 1}.${ext}`

          await prisma.class_gallery.create({
            data: CreateGalleryClassValidator.parse({
              class_id: data.id,
              index: item?.index,
              filename,
              type,
              name: data?.name,
            }),
          })
          fs.writeFile(`${dir}/${filename}`, base64Data, 'base64', () => '')
        })
      }
    }
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
    const dir = 'public/images/class'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    const thisClass = await prisma.class_store.findUnique({
      where: { id },
      include: { class_gallery: true },
    })
    const class_gallery = thisClass?.class_gallery
    if (class_gallery && class_gallery?.length > 0) {
      class_gallery?.map((item) => {
        const dir = 'public/images/class'
        const filename = `${dir}/${item?.filename}`
        if (fs.existsSync(filename)) {
          fs.unlink(filename, () => '')
        }
      })
      await prisma.class_gallery.deleteMany({
        where: { id: { in: class_gallery?.map((item) => item?.id) } },
      })
    }
    const data = await prisma.class_store.delete({ where: { id } })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dihapus', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
