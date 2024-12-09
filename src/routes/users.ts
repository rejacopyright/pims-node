import { PrismaClient } from '@prisma/client'
import express from 'express'
import omit from 'lodash/omit'
import fs from 'fs'
import { prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/trainer', async (req: any, res: any) => {
  const q = req?.query?.q || ''
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10

  try {
    const list = await prismaX.user.paginate({
      page,
      limit,
      where: {
        AND: [{ role_id: 3, status: 1 }],
        OR: [
          {
            first_name: { contains: q?.toString(), mode: 'insensitive' },
            last_name: { contains: q?.toString(), mode: 'insensitive' },
            email: { contains: q?.toString(), mode: 'insensitive' },
          },
        ],
      },
    })
    list.data = list?.data?.map((item) => {
      const newItem: any = omit(item, ['password'])
      newItem.full_name = `${item?.first_name} ${item?.last_name}`
      return newItem
    })

    return res.status(200).json(list)
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
