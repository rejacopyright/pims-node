import dotenv from 'dotenv'
import nodemailer, { SendMailOptions } from 'nodemailer'

dotenv.config()
const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD }: any = process.env
export const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: true, // use SSL
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD,
  },
})

export const sendMail = (mailOptions: SendMailOptions) => {
  return transporter.sendMail(mailOptions, (error, info) => {
    console.info({ error, info })
  })
}
