import { PrismaClient } from '@prisma/client'
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import omit from 'lodash/omit'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      // password: true,
      // created_at: true,
      // updated_at: true,
      // deleted: true,
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
    return res.status(400).json({ message: 'Account is not registered' })
  }
  const isPasswordMatch = await bcrypt.compare(password, currrentUser?.password || '')
  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Password doesn't match with your account" })
  }
  currrentUser = omit(currrentUser, ['password', 'deleted'])
  dotenv.config()
  const token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, { expiresIn: '1h' })
  return res.status(200).json({ token, user: currrentUser })
})

export default router
