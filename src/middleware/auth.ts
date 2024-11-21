import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

const AuthMiddleWare = (req, res, next) => {
  const token = req.header('Authorization')
  dotenv.config()
  if (!token) return res.status(401).json({ message: 'Access denied' })
  try {
    const bearerToken = token.split(' ')[1]
    const decoded = jwt.verify(bearerToken, process.env.TOKEN_SECRET)
    req.user = decoded.user
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export default AuthMiddleWare
