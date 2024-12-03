import { PrismaClient } from '@prisma/client'
import { paginate, prismaX } from '@src/_helper/pagination'
import express from 'express'
import moment from 'moment'
const router = express.Router()

const prisma = new PrismaClient()

router.get('/', async (req, res: any, next) => {
  return res.status(200).json({ oke: 'okelah2' })
})

router.get('/city', async (req, res: any, next) => {
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10
  const data = await prismaX.city.paginate({ page, limit, where: { province_id: 1 } })

  return res.status(200).json({ test: moment().add(1, 'months').toISOString(), data })
})

export default router
