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
        // Avatar
        const avatar = `public/images/user/${user?.avatar}`
        const avatar_link =
          user?.avatar && fs.existsSync(avatar)
            ? `${server}/static/images/user/${user?.avatar}`
            : null
        user.avatar_link = avatar_link
        // NIK
        const nik_file = `public/images/nik/${user?.nik_file}`
        const nik_link =
          user?.nik_file && fs.existsSync(nik_file)
            ? `${server}/static/images/nik/${user?.nik_file}`
            : null
        user.nik_link = nik_link
      } else {
        user = null
      }
    } catch (error) {
      user = null
    }
  }
  return user
}

export const getMember = async (id: string, req) => {
  const server = getServer(req)
  let result: any = null
  if (id) {
    result = {}
    try {
      // MEMBERSHIP
      let member: any = null
      const membership = await prisma.member_transaction.findFirst({
        where: { user_id: id, status: 2 },
      })
      if (membership?.member_id) {
        member = await prisma.member_package.findFirst({
          where: { id: membership?.member_id },
        })
      }
      if (member?.badge) {
        member.badge = fs.existsSync(`public/images/member_package/${member?.badge}`)
          ? `${server}/static/images/member_package/${member?.badge}`
          : null
      }
      result.membership = membership
      result.member = member
    } catch (error) {
      result = null
    }
  }
  return result
}
