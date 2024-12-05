import { PrismaClient } from '@prisma/client'
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import omit from 'lodash/omit'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
import { sendMail } from '@src/_helper/mail'
import moment from 'moment-timezone'
import AuthMiddleWare from '@src/middleware/auth'

const router = express.Router()
const expiresIn = '6h'
const refreshExpiresIn = '7d'

export const UserValidator = z.object({
  username: z.string({ required_error: 'Username is required' }).max(100),
  email: z
    .string({ required_error: 'Email is required' })
    .max(100)
    .email('Email format is not valid'),
  phone: z.string({ required_error: 'Phone is required' }).max(100),
  password: z.string({ required_error: 'Password is required' }).max(100),
})

const prisma = new PrismaClient({
  omit: {
    user: {
      // password: true,
      // created_at: true,
      // updated_at: true,
      // deleted: true,
    },
  },
}).$extends({
  query: {
    user: {
      create({ args, query }: any) {
        args.data = UserValidator.parse(args.data)
        return query(args)
      },
      update({ args, query }) {
        args.data = UserValidator.partial().parse(args.data)
        return query(args)
      },
    },
  },
})

router.post('/login', async (req, res: any) => {
  const { username, password } = req?.body
  if (!username) {
    return res.status(400).json({ message: 'Username is rerquired' })
  }
  if (!password) {
    return res.status(400).json({ message: 'Password is rerquired' })
  }
  let currrentUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          username: username || '',
        },
        {
          email: username || '',
        },
      ],
    },
    // omit: { password: true },
  })
  if (!currrentUser) {
    return res.status(400).json({ code: 'no_account', message: 'Account is not registered' })
  }
  const isPasswordMatch = await bcrypt.compare(password, currrentUser?.password || '')
  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Password doesn't match with your account" })
  }
  currrentUser = omit(currrentUser, ['password', 'deleted']) as any
  dotenv.config()
  const token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, { expiresIn })
  const refresh_token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, {
    expiresIn: refreshExpiresIn,
  })
  const { exp } = jwt.verify(token, process.env.TOKEN_SECRET)
  return res.status(200).json({ token, refresh_token, exp, user: currrentUser })
})

router.post('/register', async (req, res: any) => {
  const config = await prisma.config.findFirst()
  const { voucher_new_user_type = 1, voucher_new_user_value = 0 }: any = config
  const { username, password, email, phone } = req?.body
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

  // STORE USER && VOUCHER
  prisma.$transaction(async () => {
    try {
      const user = await prisma.user.create({
        data: { username, email, phone, password: await bcrypt.hash(password, 10) },
      })
      await prisma.voucher.create({
        data: {
          user_id: user?.id,
          code: 'NEWUSER',
          type: voucher_new_user_type,
          value: voucher_new_user_value,
          name: 'Pengguna Baru',
          title: 'Voucher transaksi pertama',
          expired_at: moment().add(1, 'months').toISOString(),
        },
      })
    } catch (err: any) {
      const keyByErrors = keyBy(err?.errors, 'path.0')
      const errors = mapValues(keyByErrors, 'message')
      return res.status(400).json({ status: 'failed', message: errors })
    }
  })

  // // Send the email
  res.render('email/register_confirmation', { username, password }, (err, html) => {
    sendMail({
      from: {
        name: 'PIMS CLUB',
        address: 'info@pimsclub.id',
      },
      to: email,
      subject: 'PIMS - Registrasi',
      html,
    })
  })
  return res.status(200).json({ status: 'success', message: 'Daftar Berhasil' })
})

router.post('/token/refresh', AuthMiddleWare, async (req, res: any) => {
  const bearerToken = req?.headers?.authorization?.split(' ')[1]
  const decoded = jwt.verify(bearerToken, process.env.TOKEN_SECRET)

  try {
    let currrentUser = await prisma.user.findFirst({
      where: { id: decoded?.user?.id },
    })
    currrentUser = omit(currrentUser, ['password', 'deleted']) as any

    dotenv.config()
    const token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, { expiresIn })
    const refresh_token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, {
      expiresIn: refreshExpiresIn,
    })
    const { exp } = jwt.verify(token, process.env.TOKEN_SECRET)
    return res.status(200).json({ token, refresh_token, exp, user: currrentUser })
  } catch (error) {
    res.status(403).json({ message: 'Unauthorize' })
  }
})

export default router
