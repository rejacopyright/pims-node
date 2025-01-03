import { PrismaClient } from '@prisma/client'
import { Encriptor } from '@src/_helper/encryptor'
import { paginate, prismaX } from '@src/_helper/pagination'
import express from 'express'
import moment from 'moment-timezone'
const router = express.Router()

const prisma = new PrismaClient()

router.get('/', async (req, res: any, next) => {
  const test = moment().format('yyyy-MM-DD HH:mm:ss ZZ')
  const phoneStr = '085766666393'
  const phone = { sliced: phoneStr?.slice(-8), ln: phoneStr?.length }
  const encryptedUsername = Encriptor.encrypt('REJA', 'RJ')
  const isVisit = 'VST250102172852-IQVM'.startsWith('VST')
  return res.status(200).json({ oke: 'okelah7', test, phone, encryptedUsername, isVisit })
})

router.get('/religion', async (req, res: any, next) => {
  const data = await prismaX.religion.paginate({ page: 1, limit: 100 })
  return res.status(200).json(data)
})

router.get('/occupation', async (req, res: any, next) => {
  const data = await prismaX.occupation.paginate({ page: 1, limit: 100 })
  return res.status(200).json(data)
})

router.get('/province', async (req, res: any, next) => {
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10
  const data = await prismaX.province.paginate({ page, limit })

  return res.status(200).json(data)
})

router.get('/city', async (req, res: any, next) => {
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10
  const province_id = Number(req?.query?.province_id) || null
  const data = await prismaX.city.paginate({
    page,
    limit,
    where: province_id ? { province_id } : {},
  })

  return res.status(200).json(data)
})

export default router
