import { PrismaClient } from '@prisma/client'
import express from 'express'
import moment from 'moment-timezone'
import pick from 'lodash/pick'
import sum from 'lodash/sum'
import sumBy from 'lodash/sumBy'
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
  const user = req?.user
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
          { trainer_id: user?.id },
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

// Get Class List
router.get('/booking', async (req: any, res: any) => {
  const server = getServer(req)
  const startDate = req?.query?.startDate
  const endDate = req?.query?.endDate
  const gte = moment(startDate).set({ hours: 0, minutes: 0, seconds: 0 }).toISOString()
  const lt = moment(endDate).set({ hours: 0, minutes: 0, seconds: 0 }).add(1, 'd').toISOString()
  try {
    const page = Number(req?.query?.page) || 1
    const limit = Number(req?.query?.limit) || 10
    const data = await prisma.class_schedule.groupBy({
      _count: { _all: true },
      by: 'trainer_id',
      where: {
        AND: [{ start_date: { gte } }, { start_date: { lt } }],
      },
      orderBy: { trainer_id: 'asc' },
    })
    // const services = await prisma.service.findMany({ select: { id: true, name: true } })
    const mappedData = await Promise.all(
      data?.map(async (item) => {
        const newItem: any = {}
        if (item?.trainer_id) {
          newItem.trainer = pick(await getUser(item?.trainer_id, req), [
            'id',
            'username',
            'full_name',
            'avatar_link',
          ])
          newItem.totalClass = item?._count?._all || 0
          const map_schedule = await prisma.class_schedule.findMany({
            where: {
              AND: [
                { trainer_id: item?.trainer_id },
                { start_date: { gte } },
                { start_date: { lt } },
              ],
            },
            include: {
              class: { select: { name: true } },
              transaction: {
                where: { status: { in: [1, 2, 3, 4] }, end_date: { gt: moment().toISOString() } },
                select: {
                  id: true,
                  user_id: true,
                  order_no: true,
                  total_fee: true,
                  status: true,
                  scanned_at: true,
                },
              },
            },
          })
          const class_schedule = await Promise.all(
            map_schedule?.map(async (cs) => {
              const newCS = cs
              newCS.transaction = await Promise.all(
                cs?.transaction?.map(async (tx) => {
                  const newTX: any = tx
                  if (tx?.user_id) {
                    newTX.user = await getUser(tx?.user_id, req)
                  }
                  return newTX
                })
              )
              return newCS
            })
          )
          newItem.class_schedule = class_schedule
          newItem.totalTransaction = sum(
            class_schedule?.map((item) =>
              sumBy(
                item?.transaction?.filter((f) => [2, 3]?.includes(f?.status)) || [],
                'total_fee'
              )
            )
          )
        }
        // if (item?.service_id) {
        //   newItem.service_name =
        //     services?.find(({ id }) => id === item?.service_id)?.name || 'Gym Visit'
        // }
        // if (item?.class_store?.class_gallery?.length > 0) {
        //   const imageFileName = item?.class_store?.class_gallery?.[0]?.filename
        //   const imagePath = `public/images/class/${imageFileName}`
        //   if (fs.existsSync(imagePath)) {
        //     newItem.image = `${server}/static/images/class/${imageFileName}`
        //   }
        // }
        return newItem
      })
    )
    return res.status(200).json({ data: mappedData?.filter(({ trainer }) => Boolean(trainer?.id)) })
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
