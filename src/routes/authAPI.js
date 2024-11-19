var express = require('express')
var router = express.Router()
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

router.get('/token', function (req, res, next) {
  dotenv.config()
  const token = jwt.sign({ userId: '12345' }, process.env.TOKEN_SECRET, {
    expiresIn: '1h',
  })
  res.status(200).json({ token, cr: process.env.TOKEN_SECRET })
})

module.exports = router
