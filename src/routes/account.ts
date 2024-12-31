import { PrismaClient } from '@prisma/client'
import express from 'express'
import { sendMail } from '@helper/mail'
import { paginate, prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
import fs from 'fs'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
import { getServer, toCapitalize } from '@src/_helper/function'

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

export const UpdateProfileValidator = z.object({
  first_name: z.string({ required_error: 'First Name is required' }),
  last_name: z.string({ required_error: 'Last Name is required' }),
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
  const server = getServer(req)
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
  const full_name = toCapitalize(
    data?.first_name ? `${data?.first_name} ${data?.last_name || ''}` : data?.username
  )
  const avatar = `public/images/user/${data?.avatar}`
  const avatar_link =
    data?.avatar && fs.existsSync(avatar) ? `${server}/static/images/user/${data?.avatar}` : null
  let membership = await prisma.member_transaction.findFirst({
    where: { user_id: data?.id, status: 2 },
  })
  let pending_membership = await prisma.member_transaction.findMany({
    where: { user_id: data?.id, status: 1 },
  })
  // Automatic Done by Active End Date
  // await prisma.member_transaction.updateMany({
  //   where: { user_id: data?.id, status: 2, end_date: { lte: moment().toISOString() } },
  //   data: { status: 3 },
  // })
  pending_membership = await Promise.all(
    pending_membership?.map(async (item) => {
      const newItem: any = item
      newItem.member = item?.member_id
        ? await prisma.member_package.findFirst({
            where: { id: item?.member_id },
            include: { member_features: true },
          })
        : null
      if (newItem?.member?.badge) {
        newItem.member.badge = newItem?.member?.badge
          ? `${server}/static/images/member_package/${newItem?.member?.badge}`
          : null
      }
      return newItem
    })
  )

  let member = membership?.member_id
    ? await prisma.member_package.findFirst({
        where: { id: membership?.member_id },
        include: { member_features: true },
      })
    : null

  if (member?.badge) {
    member.badge = member?.badge ? `${server}/static/images/member_package/${member?.badge}` : null
  }

  // Automatic Done by Active End Date
  if (membership?.id && moment(membership?.end_date).isBefore(moment())) {
    await prisma.member_transaction.updateMany({
      where: { id: membership?.id, status: 2, end_date: { lte: moment().toISOString() } },
      data: { status: 3 },
    })
    membership = null
    member = null
  }

  return res
    .status(200)
    .json({ ...data, avatar_link, full_name, membership, member, pending_membership })
})

router.get('/profile', async (req: any, res: any) => {
  const { user } = req
  const data: any = {}
  data.order = {}
  data.order.unpaid_count = await prisma.transaction_service.count({
    where: { user_id: user?.id, status: 1 },
  })
  data.order.active_count = await prisma.transaction_service.count({
    where: { user_id: user?.id, status: 2 },
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
        user_id: user?.id,
        status: { in: [1, 2] },
        service_id: 1,
        AND: [{ start_date: date ? { gte } : {} }, { start_date: date ? { lt } : {} }],
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
    return res.status(200).json({ status: 'success', message: 'Foto Profil berhasil diubah', data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

router.post('/update/nik', async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req?.user?.id } })
  const { nik } = req?.body

  try {
    const dir = 'public/images/nik'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    const oldNIK = `${dir}/${user?.nik_file}`
    if (user?.nik_file && fs.existsSync(oldNIK)) {
      fs.unlink(oldNIK, () => '')
    }
    const base64 = nik?.split(',')
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
      data: { nik_file: filename },
    })
    return res.status(200).json({ status: 'success', message: 'KTP berhasil diubah', data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

router.post('/update/profile', async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req?.user?.id } })
  const {
    email,
    first_name,
    last_name,
    phone,
    nik,
    nik_file,
    nik_url,
    birth,
    gender,
    marital,
    religion_id,
    occupation_id,
    province_id,
    city_id,
    address,
    social,
  } = req?.body

  try {
    const isExist = await prisma.user.findFirst({ where: { nik, NOT: { id: user?.id } } })
    if (isExist) {
      return res.status(400).json({ status: 'failed', message: 'NIK sudah terdaftar' })
    }
    const data = await prisma.user.update({
      where: { id: user?.id },
      data: UpdateProfileValidator.passthrough()
        .partial()
        .parse({
          email,
          first_name,
          last_name,
          phone,
          nik,
          birth: moment(birth).toISOString(),
          gender,
          marital,
          religion_id,
          occupation_id,
          province_id,
          city_id,
          address,
          social,
        }),
    })
    return res.status(200).json({ status: 'success', message: 'Profile berhasil dibuat', data })
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    return res.status(400).json({ status: 'failed', message: errors, err })
  }
})

router.delete('/delete/nik', async (req: any, res: any) => {
  const user = await prisma.user.findUnique({ where: { id: req?.user?.id } })

  try {
    const dir = 'public/images/nik'
    const oldNIK = `${dir}/${user?.nik_file}`
    if (user?.nik_file && fs.existsSync(oldNIK)) {
      fs.unlink(oldNIK, () => '')
    }
    const data = await prisma.user.update({
      where: { id: user?.id },
      data: { nik_file: null },
    })
    return res.status(200).json({ status: 'success', message: 'KTP berhasil dihapus', data })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
