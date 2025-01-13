import { PrismaClient } from '@prisma/client'
import express from 'express'
import bcrypt from 'bcrypt'
import omit from 'lodash/omit'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { prismaX } from '@helper/pagination'
import fs from 'fs'
import { getServer } from '@src/_helper/function'
import { sendMail } from '@src/_helper/mail'
import moment from 'moment-timezone'
import { Encriptor } from '@src/_helper/encryptor'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/trainer', async (req: any, res: any) => {
  const server = getServer(req)
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
          { first_name: { contains: q?.toString(), mode: 'insensitive' } },
          { last_name: { contains: q?.toString(), mode: 'insensitive' } },
          { username: { contains: q?.toString(), mode: 'insensitive' } },
          { email: { contains: q?.toString(), mode: 'insensitive' } },
        ],
      },
      orderBy: { updated_at: 'desc' },
    })
    list.data = list?.data?.map((item) => {
      const newItem: any = omit(item, ['password'])
      newItem.full_name = newItem?.first_name
        ? `${newItem?.first_name} ${newItem?.last_name || ''}`
        : newItem?.username
      const avatar = `public/images/user/${newItem?.avatar}`
      const avatar_link =
        newItem?.avatar && fs.existsSync(avatar)
          ? `${server}/static/images/user/${newItem?.avatar}`
          : null
      newItem.avatar_link = avatar_link
      return newItem
    })

    return res.status(200).json(list)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get('/regular', async (req: any, res: any) => {
  const server = getServer(req)

  const q = req?.query?.q || ''
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10

  try {
    const list = await prismaX.user.paginate({
      page,
      limit,
      where: {
        AND: [{ role_id: 1, status: 1 }],
        OR: [
          { first_name: { contains: q?.toString(), mode: 'insensitive' } },
          { last_name: { contains: q?.toString(), mode: 'insensitive' } },
          { username: { contains: q?.toString(), mode: 'insensitive' } },
          { email: { contains: q?.toString(), mode: 'insensitive' } },
        ],
      },
      orderBy: { updated_at: 'desc' },
    })
    list.data = list?.data?.map((item) => {
      const newItem: any = omit(item, ['password'])
      newItem.full_name = newItem?.first_name
        ? `${newItem?.first_name} ${newItem?.last_name || ''}`
        : newItem?.username
      const avatar = `public/images/user/${newItem?.avatar}`
      const avatar_link =
        newItem?.avatar && fs.existsSync(avatar)
          ? `${server}/static/images/user/${newItem?.avatar}`
          : null
      newItem.avatar_link = avatar_link
      return newItem
    })

    return res.status(200).json(list)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get('/member', async (req: any, res: any) => {
  const server = getServer(req)
  const q = req?.query?.q || ''
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10

  try {
    const list = await prismaX.user.paginate({
      page,
      limit,
      where: {
        AND: [{ role_id: 2, status: 1 }],
        OR: [
          { first_name: { contains: q?.toString(), mode: 'insensitive' } },
          { last_name: { contains: q?.toString(), mode: 'insensitive' } },
          { username: { contains: q?.toString(), mode: 'insensitive' } },
          { email: { contains: q?.toString(), mode: 'insensitive' } },
        ],
      },
      orderBy: { updated_at: 'desc' },
    })
    list.data = await Promise.all(
      list?.data?.map(async (item) => {
        const newItem: any = omit(item, ['password'])
        // FULL NAME
        newItem.full_name = newItem?.first_name
          ? `${newItem?.first_name} ${newItem?.last_name || ''}`
          : newItem?.username

        // AVATAR
        const avatar = `public/images/user/${newItem?.avatar}`
        const avatar_link =
          newItem?.avatar && fs.existsSync(avatar)
            ? `${server}/static/images/user/${newItem?.avatar}`
            : null
        newItem.avatar_link = avatar_link

        // MEMBERSHIP
        let member: any = null
        const membership = await prisma.member_transaction.findFirst({
          where: { user_id: item?.id, status: 2 },
        })
        if (membership?.member_id) {
          member = await prisma.member_package.findFirst({
            where: { id: membership?.member_id },
          })
        }
        if (member?.badge) {
          member.badge = fs.existsSync(`public/images/member_package/${member?.badge}`)
            ? `${server}/static/images/member_package/${member?.badge}`
            : null
        }
        newItem.membership = membership
        newItem.member = member

        return newItem
      })
    )

    return res.status(200).json(list)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post('/create', async (req, res: any) => {
  const { username, password, email, phone, first_name, last_name, role_id, ref, member_id } =
    req?.body
  const anyUsername = await prisma.user.findFirst({
    where: { username: username || '' },
  })
  const anyEmail = await prisma.user.findFirst({
    where: { email: email || '' },
  })
  if (anyUsername) {
    return res.status(400).json({ status: 'failed', message: 'Username has been taken' })
  }
  if (anyEmail) {
    return res.status(400).json({ status: 'failed', message: 'Email has been taken' })
  }

  // STORE USER && MEMBER
  let data: any = null
  prisma.$transaction(async () => {
    try {
      data = await prisma.user.create({
        data: {
          username,
          email,
          phone,
          first_name,
          last_name,
          role_id: role_id === 2 && !member_id ? 1 : member_id,
          ref,
          ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        },
      })
      if (member_id) {
        const member_package = await prisma.member_package.findUnique({ where: { id: member_id } })
        const encryptedUsername = Encriptor.encrypt(data?.username?.toUpperCase(), 'RJ')
        const order_no = `MBC${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
        await prisma.member_transaction.create({
          data: {
            order_no,
            member_id,
            user_id: data?.id,
            payment_id: 'corporate',
            duration: member_package?.duration,
            purchased_at: moment().toISOString(),
            status: 2,
            start_date: moment().toISOString(),
            end_date: moment()
              .add({ days: member_package?.duration || 30 })
              .toISOString(),
          },
        })
      }
      return res.status(200).json({ status: 'success', message: 'User successfully added', data })
    } catch (err: any) {
      const keyByErrors = keyBy(err?.errors, 'path.0')
      const errors = mapValues(keyByErrors, 'message')
      return res.status(400).json({ status: 'failed', message: errors })
    }
  })
})

router.post('/create/bulk', async (req, res: any) => {
  const { data, member_id } = req?.body

  // STORE USER && VOUCHER
  try {
    if (Array.isArray(data) && data?.length > 0) {
      const duplicated = await prisma.user.findMany({
        where: {
          OR: [
            { username: { in: data?.map(({ username }) => username) } },
            { email: { in: data?.map(({ email }) => email) } },
          ],
        },
        select: { username: true, email: true },
      })
      if (duplicated?.length) {
        return res.status(400).json({
          status: 'duplicated',
          message: 'Terdapat duplikasi data',
          data: duplicated,
        })
      }

      await prisma.$transaction(async () => {
        if (member_id) {
          data?.map(async (m) => {
            const newMap = m
            newMap.role_id = m?.role_id == 2 && !member_id ? 1 : m?.role_id
            const newUser = await prisma.user.create({ data: newMap })
            const member_package = await prisma.member_package.findUnique({
              where: { id: member_id },
            })
            const encryptedUsername = Encriptor.encrypt(newUser?.username?.toUpperCase(), 'RJ')
            const order_no = `MBC${moment().format(`YYMMDDHHmmss`)}-${encryptedUsername}`
            await prisma.member_transaction.create({
              data: {
                order_no,
                member_id,
                user_id: newUser?.id,
                payment_id: 'corporate',
                duration: member_package?.duration,
                purchased_at: moment().toISOString(),
                status: 2,
                start_date: moment().toISOString(),
                end_date: moment()
                  .add({ days: member_package?.duration || 30 })
                  .toISOString(),
              },
            })
            return newMap
          })
        } else {
          const mapData = data?.map((m) => {
            const newMap = m
            newMap.role_id = m?.role_id == 2 && !member_id ? 1 : m?.role_id
            return newMap
          })
          await prisma.user.createMany({ data: mapData || [] })
        }
      })
      return res.status(200).json({ status: 'success', message: 'Users successfully added' })
    } else {
      return res.status(400).json({ status: 'failed', message: 'Data tidak boleh kosong' })
    }
  } catch (err: any) {
    const keyByErrors = keyBy(err?.errors, 'path.0')
    const errors = mapValues(keyByErrors, 'message')
    const prismaErrors = err?.message?.split('\n')
    const prismaErrorMessage = prismaErrors?.[prismaErrors?.length - 1]
    return res
      .status(400)
      .json({ status: 'failed', message: err?.errors?.length ? errors : prismaErrorMessage })
  }
})

router.put('/:id/update', async (req, res: any) => {
  const { id } = req?.params
  const { username, password, email, phone, first_name, last_name } = req?.body
  const anyUsername = await prisma.user.findFirst({
    where: { NOT: { id }, username: username || '' },
  })
  const anyEmail = await prisma.user.findFirst({
    where: { NOT: { id }, email: email || '' },
  })
  if (anyUsername) {
    return res.status(400).json({ status: 'failed', message: 'Username has been taken' })
  }
  if (anyEmail) {
    return res.status(400).json({ status: 'failed', message: 'Email has been taken' })
  }

  // STORE USER && VOUCHER
  let data: any = null
  prisma.$transaction(async () => {
    try {
      data = await prisma.user.update({
        where: { id },
        data: {
          username,
          email,
          phone,
          first_name,
          last_name,
          ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        },
      })
      return res.status(200).json({ status: 'success', message: 'User successfully updated', data })
    } catch (err: any) {
      const keyByErrors = keyBy(err?.errors, 'path.0')
      const errors = mapValues(keyByErrors, 'message')
      return res.status(400).json({ status: 'failed', message: errors })
    }
  })
})

router.post('/:id/move/:role(regular|trainer|member)', async (req, res: any) => {
  const { id, role } = req?.params
  const roleObj = { regular: 1, member: 2, trainer: 3 }
  const role_id = roleObj?.[role]

  prisma.$transaction(async () => {
    try {
      const data = await prisma.user.update({ where: { id }, data: { role_id } })
      if (role === 'regular') {
        await prisma.member_transaction.updateMany({
          where: { user_id: data?.id, status: 2 },
          data: { status: 3 },
        })
      }
      return res.status(200).json({ status: 'success', message: 'User successfully moved', data })
    } catch (err: any) {
      const keyByErrors = keyBy(err?.errors, 'path.0')
      const errors = mapValues(keyByErrors, 'message')
      return res.status(400).json({ status: 'failed', message: errors })
    }
  })
})

const deleteUserFn = async (id) => {
  try {
    const thisUser = await prisma.user.findUnique({ where: { id } })
    if (thisUser?.avatar) {
      const dir = 'public/images/user'
      const filename = `${dir}/${thisUser?.avatar}`
      if (fs.existsSync(filename)) {
        fs.unlink(filename, () => '')
      }
    }
    if (thisUser?.nik_file) {
      const dir = 'public/images/nik'
      const filename = `${dir}/${thisUser?.nik_file}`
      if (fs.existsSync(filename)) {
        fs.unlink(filename, () => '')
      }
    }

    await prisma.voucher.deleteMany({ where: { user_id: id } })
    // await prisma.transaction_service.deleteMany({ where: { user_id: id } })
    // await prisma.member_transaction.deleteMany({ where: { user_id: id } })

    const data = await prisma.user.delete({ where: { id } })
    return data
  } catch (err: any) {
    return err
  }
}
router.delete('/:id/delete', async (req, res: any) => {
  const { id } = req?.params

  // STORE USER
  prisma.$transaction(async () => {
    try {
      const data = await deleteUserFn(id)
      return res.status(200).json({ status: 'success', message: 'User successfully removed', data })
    } catch (err) {
      return res.status(400).json({ status: 'failed', message: err })
    }
  })
})
router.delete('/delete/self', async (req: any, res: any) => {
  const { id } = req?.user

  // STORE USER
  prisma.$transaction(async () => {
    try {
      const data = await deleteUserFn(id)
      return res.status(200).json({ status: 'success', message: 'User successfully removed', data })
    } catch (err) {
      return res.status(400).json({ status: 'failed', message: err })
    }
  })
})

export default router
