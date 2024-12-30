import { PrismaClient } from '@prisma/client'
import express from 'express'
import { prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import fs from 'fs'
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

export const CreateMemberPackageValidator = z.object({
  name: z.string({ required_error: 'Package name is required' }).min(1, 'Package name is required'),
  level: z.number({ required_error: 'Level is required' }).min(1, 'Level at least 1'),
})

// Get Member Package List
router.get('/', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const q = req?.query?.q || ''
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const data = await prismaX.member_package.paginate({
      page,
      limit,
      where: {
        // AND: [{}],
        OR: [
          { name: { contains: q?.toString(), mode: 'insensitive' } },
          // { description: { contains: q?.toString(), mode: 'insensitive' } },
        ],
      },
      include: { member_features: true },
      orderBy: { level: 'asc' },
      // orderBy: { updated_at: 'desc' },
    })
    data.data = data?.data?.map((item) => {
      const newItem = item
      newItem.badge = item?.badge ? `${server}/static/images/member_package/${item?.badge}` : null
      return newItem
    })
    return res.status(200).json({ ...data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Get Detail Member Package
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const data = await prisma.member_package.findUnique({
      where: { id },
      include: { member_features: true },
    })
    const newData: any = data || {}
    if (data?.badge) {
      newData.badge = data?.badge ? `${server}/static/images/member_package/${data?.badge}` : null
    }
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// Create Member Package
router.post('/create', async (req: any, res: any) => {
  const {
    level,
    name,
    fee,
    fee_before,
    duration,
    quota_visit_per_day,
    quota_class_per_day,
    description,
    tnc,
    image,
    features,
  } = req?.body

  try {
    const checkDuplicateLevel = await prisma.member_package.findUnique({ where: { level } })
    if (checkDuplicateLevel) {
      return res.status(400).json({ status: 'failed', message: `Level ${level} sudah ada` })
    }

    let filename
    if (image) {
      const dir = 'public/images/member_package'
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

    const data = await prisma.member_package.create({
      data: CreateMemberPackageValidator.passthrough().parse({
        level,
        name,
        fee: parseInt(fee || 0),
        fee_before: fee_before ? parseInt(fee_before) : null,
        duration: parseInt(duration || 30),
        quota_visit_per_day: quota_visit_per_day ? parseInt(quota_visit_per_day) : null,
        quota_class_per_day: parseInt(quota_class_per_day || 2),
        description,
        tnc,
        badge: filename,
      }),
    })

    if (features?.length > 0) {
      await prisma.member_features.createMany({
        data: features?.map((item) => ({
          member_id: data?.id,
          index: item?.index,
          title: item?.title,
          sub_title: item?.sub_title,
          value: item?.value,
        })),
        skipDuplicates: true,
      })
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Member Package successfully created', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Update Member Package
router.put('/:id/update', async (req: any, res: any) => {
  const {
    level,
    name,
    fee,
    fee_before,
    duration,
    quota_visit_per_day,
    quota_class_per_day,
    description,
    tnc,
    image,
    isImageChanged,
    features,
  } = req?.body
  const { id } = req?.params

  try {
    const checkDuplicateLevel = await prisma.member_package.findUnique({
      where: { level, NOT: { id } },
    })
    if (checkDuplicateLevel) {
      return res.status(400).json({ status: 'failed', message: `Level ${level} sudah ada` })
    }

    let filename
    if (isImageChanged) {
      const dir = 'public/images/member_package'
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      const thisMemberPackage = await prisma.member_package.findUnique({ where: { id } })
      if (thisMemberPackage?.badge) {
        const filename = `${dir}/${thisMemberPackage?.badge}`
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

    const data = await prisma.member_package.update({
      where: { id },
      data: CreateMemberPackageValidator.partial()
        .passthrough()
        .parse({
          level,
          name,
          fee: parseInt(fee || 0),
          fee_before: fee_before ? parseInt(fee_before) : null,
          duration: parseInt(duration || 30),
          quota_visit_per_day: quota_visit_per_day ? parseInt(quota_visit_per_day) : null,
          quota_class_per_day: parseInt(quota_class_per_day || 2),
          description,
          tnc,
          badge: filename,
        }),
    })

    await prisma.member_features.deleteMany({ where: { member_id: id } })
    if (features?.length > 0) {
      await prisma.member_features.createMany({
        data: features?.map((item) => ({
          member_id: data?.id,
          index: item?.index,
          title: item?.title,
          sub_title: item?.sub_title,
          value: item?.value,
        })),
        skipDuplicates: true,
      })
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Member Package successfully changed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

// Delete Member Package
router.delete('/:id/delete', async (req: any, res: any) => {
  const { id } = req?.params

  try {
    const dir = 'public/images/member_package'
    const thisMemberPackage = await prisma.member_package.findUnique({ where: { id } })
    if (thisMemberPackage?.badge) {
      const filename = `${dir}/${thisMemberPackage?.badge}`
      if (fs.existsSync(filename)) {
        fs.unlink(filename, () => '')
      }
    }
    const data = await prisma.member_package.delete({ where: { id } })
    return res
      .status(200)
      .json({ status: 'success', message: 'Member Package successfully removed', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors })
  }
})

export default router
