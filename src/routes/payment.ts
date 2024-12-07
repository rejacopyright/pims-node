import { PrismaClient } from '@prisma/client'
import express from 'express'
import { sendMail } from '@helper/mail'
import { paginate, prismaX } from '@helper/pagination'
import moment from 'moment-timezone'
import { coreApi } from '@src/_helper/midtrans'
const router = express.Router()

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
    transaction_service: {
      deleted: true,
    },
  },
})

router.post('/charge', async (req: any, res: any) => {
  const { user } = req
  try {
    const data = await prismaX.user.paginate({
      page: 2,
      limit: 3,
      where: { first_name: { contains: '3' } },
      include: { religion: true },
    })
    // const chargeResponse = await coreApi.charge({})
    const params = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: 'order-109',
        gross_amount: 15000,
      },
      bank_transfer: {
        bank: 'bca',
        va_number: '085766666393',
        free_text: {
          inquiry: [
            {
              id: 'inquiry ID',
              en: 'inquiry EN',
            },
          ],
          payment: [
            {
              id: 'payment ID',
              en: 'payment EN',
            },
          ],
        },
        // bca: {
        //   sub_company_code: '00000',
        // },
      },
    }
    coreApi
      .charge(params)
      .then((res) => {
        //
      })
      .catch((err) => {
        console.error(err)
      })
    return res.status(200).json({ chargeResponse: '', data })
  } catch (err) {
    return res.status(400).json({ status: 'failed', message: err })
  }
})

// router.post('/capture', async (req: any, res: any) => {
//   const { user } = req
//   const { transaction_id, gross_amount } = req?.body || {}
//   try {
//     const params = {
//       transaction_id,
//       gross_amount,
//     }
//     coreApi
//       .capture(params)
//       .then((res) => {
//         //
//       })
//       .catch((err) => {
//         //
//       })
//     return res.status(200).json({ captureResponse: '' })
//   } catch (err) {
//     return res.status(400).json({ status: 'failed', message: err })
//   }
// })

export default router
