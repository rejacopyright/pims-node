import express from 'express'
const router = express.Router()

router.get('/me', function (req: any, res, next) {
  res.status(200).json({ message: 'Protected route accessed', userId: req?.userId })
})

export default router
