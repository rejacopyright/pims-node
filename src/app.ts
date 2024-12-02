import 'module-alias/register'
import createError from 'http-errors'
import express from 'express'
import path from 'path'
import { renderFile } from 'ejs'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors, { CorsOptions } from 'cors'

import indexRouter from './routes/index'
import usersAPI from './routes/users'
import accountAPI from './routes/account'
import authAPI from './routes/auth'
import globalAPI from './routes/global'
import transactionAPI from './routes/transaction'
import orderAPI from './routes/order'
import classAPI from './routes/class'
import AuthMiddleWare from './middleware/auth'

const app = express()

// const corsOptions: CorsOptions = { origin: true, credentials: true, allowedHeaders: '*' }

// view engine setup
app.set('views', path.join(__dirname, '../views'))
app.engine('html', renderFile)
app.set('view engine', 'html')

app.use(logger('dev'))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: false }))
app.use(cookieParser())
app.use(cors())

app.use('/static', express.static(path.join(__dirname, '../public')))

app.use('/', indexRouter)
app.use('/api/v1/auth', authAPI)
app.use('/api/v1/global', globalAPI)
app.use('/api/v1/transaction', AuthMiddleWare, transactionAPI)
app.use('/api/v1/order', AuthMiddleWare, orderAPI)
app.use('/api/v1/users', AuthMiddleWare, usersAPI)
app.use('/api/v1/class', AuthMiddleWare, classAPI)
app.use('/api/v1', AuthMiddleWare, accountAPI)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

export default app
