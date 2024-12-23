import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
})

export const getServer = (req) => req.protocol + '://' + req.get('host')

export const toCapitalize = (text?: string) =>
  text?.replace(/(?:^|\s)\S/g, (a: any) => a?.toUpperCase())

export const getUser = async (id: string, req) => {
  const server = getServer(req)
  let user: any = null
  if (id) {
    try {
      user = await prisma.user.findUnique({ where: { id } })
      if (user) {
        user.full_name = user?.first_name
          ? `${user?.first_name} ${user?.last_name || ''}`
          : user?.username
        const avatar = `public/images/user/${user?.avatar}`
        const avatar_link =
          user?.avatar && fs.existsSync(avatar)
            ? `${server}/static/images/user/${user?.avatar}`
            : null
        user.avatar_link = avatar_link
      } else {
        user = null
      }
    } catch (error) {
      user = null
    }
  }
  return user
}
