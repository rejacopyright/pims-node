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

router.post('/link/gopay', async (req: any, res: any) => {
  const { user }: any = req
  const { id, phone } = req?.body || {}
  try {
    // const chargeResponse = await coreApi.charge({})
    const params = {
      payment_type: 'gopay',
      gopay_partner: {
        phone_number: phone?.toString(),
        country_code: '62',
        redirect_url: 'https://www.gojek.com',
      },
    }
    const linkingAPI = await coreApi.linkPaymentAccount(params)
    let data: any = null
    if (user?.id && linkingAPI?.status_code === '201') {
      const linkParams: any = {
        user_id: user?.id,
        type: 'gopay',
        label: 'Gopay',
        account: linkingAPI,
        phone_number: phone?.toString(),
      }
      const isExist = await prisma.payment_account.findFirst({
        where: { user_id: user?.id, type: 'gopay', status: 1 },
      })
      if (!isExist) {
        data = await prisma.payment_account.create({ data: linkParams })
      } else if (id) {
        data = await prisma.payment_account.update({ where: { id }, data: linkParams })
      }
      return res.status(200).json({ status: 'success', data, account: linkingAPI })
    } else {
      return res.status(400).json({ status: 'failed', message: 'User not found' })
    }
  } catch (err) {
    return res.status(400).json({ status: 'failed', message: err })
  }
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
