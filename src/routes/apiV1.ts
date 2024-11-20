import express from 'express'
const router = express.Router()

router.get('/me', (req: any, res: any) => {
  const { user } = req
  return res.status(200).json(user)
})

export default router
