import midtransClient from 'midtrans-client'
import dotenv from 'dotenv'
import moment from 'moment-timezone'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

dotenv.config()
const { MIDTRANS_CLIENT_KEY, MIDTRANS_SERVER_KEY }: any = process.env

export const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  clientKey: MIDTRANS_CLIENT_KEY,
  serverKey: MIDTRANS_SERVER_KEY,
})

export const apiClient = new midtransClient.Snap({
  isProduction: false,
  clientKey: MIDTRANS_CLIENT_KEY,
  serverKey: MIDTRANS_SERVER_KEY,
})

export interface createTransactionType {
  order_no: string
  type: string
  product_name: string
  requestBody: any
  user: any
  custom_expiry?: {
    expiry_duration: number
    unit: 'second' | 'minute' | 'hour' | 'day'
  }
}

export const createTransaction = async ({
  order_no,
  type,
  product_name,
  requestBody,
  user,
  custom_expiry,
}: createTransactionType) => {
  const { payment_id } = requestBody || {}
  const payment_method = await prisma.payment_method.findFirst({ where: { name: payment_id } })
  const custom_va = user?.phone && user?.phone?.length > 10 ? user?.phone?.slice(-10) : user?.phone
  let params = {}
  const globalOptions = {
    custom_expiry: {
      order_time: moment().format('yyyy-MM-DD HH:mm:ss ZZ'),
      expiry_duration: custom_expiry?.expiry_duration
        ? custom_expiry?.expiry_duration
        : payment_method?.deadline || 30,
      unit: custom_expiry?.unit ? custom_expiry?.unit : 'minute',
    },
    ...(!['shopee_pay', 'gopay'].includes(payment_id)
      ? {
          metadata: {
            type,
          },
        }
      : {}),
    customer_details: {
      first_name: user?.first_name || user?.username || '',
      last_name: !user?.first_name ? '' : user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    item_details: [
      {
        id: order_no,
        price: requestBody?.total_fee,
        quantity: 1,
        name: product_name,
      },
    ],
  }
  if (['bca', 'bni', 'bri', 'cimb', 'danamon'].includes(payment_id)) {
    params = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      bank_transfer: {
        bank: payment_id,
        va_number: custom_va,
      },
      ...globalOptions,
    }
  } else if (['mandiri'].includes(payment_id)) {
    params = {
      payment_type: 'echannel',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      echannel: {
        bill_info1: 'Payment:',
        bill_info2: 'Online purchase',
        bill_key: custom_va,
      },
      ...globalOptions,
    }
  } else if (['permata'].includes(payment_id)) {
    params = {
      payment_type: 'permata',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      bank_transfer: {
        bank: 'permata',
        va_number: custom_va,
      },
      ...globalOptions,
    }
  } else if (['qris'].includes(payment_id)) {
    params = {
      payment_type: 'qris',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      qris: { acquirer: 'gopay' },
      ...globalOptions,
    }
  } else if (['shopee_pay'].includes(payment_id)) {
    params = {
      payment_type: 'shopeepay',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      shopeepay: {
        callback_url: 'https://pimsclub.id/',
      },
      ...globalOptions,
    }
  } else if (['gopay'].includes(payment_id)) {
    params = {
      payment_type: 'gopay',
      transaction_details: {
        order_id: order_no,
        gross_amount: requestBody?.total_fee,
      },
      gopay: {
        enable_callback: true,
        callback_url: 'https://pimsclub.id/',
      },
      ...globalOptions,
    }
  }
  const payment = await coreApi.charge(params)
  return payment
}
