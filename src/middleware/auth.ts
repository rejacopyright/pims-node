import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

function AuthMiddleWare(req, res, next) {
  const token = req.header('Authorization')
  dotenv.config()
  if (!token) return res.status(401).json({ error: 'Access denied' })
  try {
    const bearerToken = token.split(' ')[1]
    const decoded = jwt.verify(bearerToken, process.env.TOKEN_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export default AuthMiddleWare
