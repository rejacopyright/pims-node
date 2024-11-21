import express from 'express'
const router = express.Router()

/* GET home page. */
router.get('/', async (req, res: any, next) => {
  // await res.render(
  //   'email/register_confirmation',
  //   { username: 'Reja Jamil', password: 'oke' },
  //   async (err, html) => {
  //     await sendMail({
  //       from: {
  //         name: 'PIMS CLUB',
  //         address: 'info@pimsclub.id',
  //       },
  //       to: 'rejajamil@gmail.com',
  //       subject: 'PIMS - Registrasi',
  //       html,
  //     })
  //   }
  // )
  return res.status(200).json({ oke: 'oke' })
})

export default router
