import { PrismaClient } from '@prisma/client'
import express from 'express'
import { prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
import fs from 'fs'
import { z } from 'zod'
import { getServer } from '@src/_helper/function'

const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

// Get Detail Member Package
router.get('/:id/detail', async (req: any, res: any) => {
  const server = getServer(req)
  try {
    const { id } = req?.params
    const data = await prisma.member_transaction.findUnique({ where: { id } })
    const newData: any = data || {}
    const member = data?.member_id
      ? await prisma.member_package.findFirst({
          where: { id: data?.member_id },
          include: { member_features: true },
        })
      : null
    if (member?.badge) {
      member.badge = member?.badge
        ? `${server}/static/images/member_package/${member?.badge}`
        : null
    }
    newData.member = member
    return res.status(200).json(newData)
  } catch (err: any) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

export default router
