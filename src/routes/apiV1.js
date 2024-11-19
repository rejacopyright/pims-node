var express = require('express')
var router = express.Router()
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

router.get('/me', function (req, res, next) {
  res.status(200).json({ message: 'Protected route accessed', userId: req.userId })
})

module.exports = router
