import { PrismaClient } from '@prisma/client'
import express from 'express'
import omit from 'lodash/omit'
import { paginate } from '@helper/pagination'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/trainer', async (req: any, res: any) => {
  const q = Number(req?.query?.q) || 1
  const page = Number(req?.query?.page) || 1
  const limit = Number(req?.query?.limit) || 10

  try {
    const list = await paginate('user', {
      page,
      limit,
      where: {
        OR: [
          { role_id: 3, status: 1 },
          {
            first_name: { contains: q?.toString() },
            last_name: { contains: q?.toString() },
            email: { contains: q?.toString() },
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

export default router
