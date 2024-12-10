import { PrismaClient } from '@prisma/client'
import express from 'express'
import omit from 'lodash/omit'
import { prismaX } from '@helper/pagination'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

router.get('/trainer', async (req: any, res: any) => {
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
          {
            first_name: { contains: q?.toString(), mode: 'insensitive' },
            last_name: { contains: q?.toString(), mode: 'insensitive' },
            email: { contains: q?.toString(), mode: 'insensitive' },
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
