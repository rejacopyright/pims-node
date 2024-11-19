var { PrismaClient } = require('@prisma/client')
var express = require('express')
var router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const omit = require('lodash/omit')

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

router.post('/login', async function (req, res, next) {
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
  currrentUser = omit(currrentUser, ['password'])
  dotenv.config()
  const token = jwt.sign({ user: currrentUser }, process.env.TOKEN_SECRET, { expiresIn: '1h' })
  return res.status(200).json({ token, user: currrentUser })
})

module.exports = router
