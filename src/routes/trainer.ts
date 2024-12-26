import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import { z } from 'zod'
import fs from 'fs'
import { getServer, getUser } from '@src/_helper/function'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

// Get Class List
router.get('/my-schedule', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const q = req?.query?.q || ''
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const { service } = req?.params
    const serviceObj = { studio: 2, functional: 3 }
    const lte = moment().add(30, 'd').toISOString()
    const data = await prisma.class_schedule.findMany({
      where: {
        AND: [
          { service_id: serviceObj[service] },
          { start_date: { gt: moment().toISOString() } },
          { start_date: { lte } },
        ],
      },
      include: { class: { include: { class_gallery: true } } },
      orderBy: { start_date: 'desc' },
    })
    const mappedData = await Promise.all(
      data?.map(async (item) => {
        const newItem: any = item
        const classImg =
          item?.class?.class_gallery && item?.class?.class_gallery?.length > 0
            ? item?.class?.class_gallery?.[0]?.filename
            : null
        const imgPath = `public/images/class/${classImg}`
        const image =
          classImg && fs.existsSync(imgPath) ? `${server}/static/images/class/${classImg}` : null
        if (newItem.class) {
          newItem.class.image = image
        }

        const transaction = await prisma.transaction_service.findMany({
          where: { class_schedule_id: item?.id, status: 2 },
        })
        newItem.transaction = await Promise.all(
          transaction?.map(async (trx) => {
            const newTrx: any = trx
            if (trx?.user_id) {
              newTrx.user = await getUser(trx?.user_id, req)
            }
            return newTrx
          })
        )
        return newItem
      })
    )
    return res.status(200).json({ data: mappedData })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
