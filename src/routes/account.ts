import { PrismaClient } from '@prisma/client'
import express from 'express'
import { sendMail } from '@helper/mail'
import { paginate, prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
import fs from 'fs'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
    transaction_service: {
      deleted: true,
    },
  },
})

router.get('/test', async (req: any, res: any) => {
  const { user } = req
  const data = await prismaX.user.paginate({
    page: 2,
    limit: 3,
    where: { first_name: { contains: '3' } },
    include: { religion: true },
  })
  return res.status(200).json(data)
})

router.get('/me', async (req: any, res: any) => {
  const { user } = req
  const data = await prisma.user.findFirst({
    where: {
      id: user?.id || '',
    },
    include: {
      religion: true,
      occupation: true,
      province: true,
      city: true,
    },
  })
  return res.status(200).json(data)
})

router.get('/voucher', async (req: any, res: any) => {
  const { user } = req
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10

  try {
    const list = await prismaX.voucher.paginate({
      page,
      limit,
      where: { user_id: user?.id, status: 1 },
    })
    list.data = list?.data?.map((item) => {
      const newItem: any = item
      newItem.exp = moment(item.expired_at).format('YYYY-MM-DD HH:mm')
      return newItem
    })

    return res.status(200).json(list)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get('/my-visit', async (req: any, res: any) => {
  const { user } = req
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10
  const date = req?.query?.date
  const gte = moment(date).toISOString()
  const lt = moment(date).set({ hours: 0, minutes: 0, seconds: 0 }).add(1, 'd').toISOString()

  try {
    const list = await prisma.transaction_service.findMany({
      where: {
        // OR: [{ user_id: user?.id, status: { in: [1, 2] }, start_date: date ? { gte, lt } : {} }],
        AND: [
          { user_id: user?.id, status: { in: [1, 2] } },
          { start_date: date ? { gte } : {} },
          { start_date: date ? { lt } : {} },
        ],
      },
    })

    return res.status(200).json(
      list.map((item) => {
        const newItem: any = item
        newItem.start_date = moment(item.start_date).format('YYYY-MM-DD HH:mm')
        newItem.start_time = moment(item.start_date).format('HH:mm')
        return newItem
      })
    )
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post('/update/avatar', async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req?.user?.id } })
  const { avatar } = req?.body

  try {
    const dir = 'public/images/user'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    const oldAvatar = `${dir}/${user?.avatar}`
    if (user?.avatar && fs.existsSync(oldAvatar)) {
      fs.unlink(oldAvatar, () => '')
    }
    const base64 = avatar?.split(',')
    const base64Ext = base64?.[0]?.toLowerCase()
    const base64Data = base64?.[1]
    let ext = 'png'
    // var base64_buffer = Buffer.from(base64, 'base64')
    if (base64Ext?.indexOf('jpeg') !== -1) {
      ext = 'jpg'
    }
    const filename = `${user?.username}_${moment().format('YYYYMMDDHHmmss')}.${ext}`

    fs.writeFile(`${dir}/${filename}`, base64Data, 'base64', () => '')
    const data = await prisma.user.update({
      where: { id: user?.id },
      data: { avatar: filename },
    })
    return res.status(200).json({ status: 'success', message: 'Kelas berhasil dibuat', data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
