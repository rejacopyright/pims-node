import { Prisma, PrismaClient } from '@prisma/client'
import { JsArgs } from '@prisma/client/runtime/library'
import omit from 'lodash/omit'

interface PaginateTypes {
  page: number
  limit: number
  select?: Object
  omit?: Object
  include?: Object
  where?: Object
  orderBy?: Object | Object[]
  cursor?: Object
  distinct?: string | string[]
  // [key: string]: Object
}

type modelType = Prisma.TypeMap['meta']['modelProps']

export const paginate = async (model: modelType, options: PaginateTypes) => {
  const prisma = new PrismaClient()
  const db = prisma.$extends({
    query: {
      $allModels: {
        findMany({ args, query }) {
          return query({
            ...args,
            skip: currentCount,
            take: limit,
            include: options?.include || {},
          })
        },
      },
    },
  })
  const originalOptions = { ...omit(options, ['page', 'limit', 'include']) }
  const total = await db[model.toString()].count(originalOptions)
  const { page, limit } = options
  const last_page = Math.ceil(total / limit)
  const currentCount = (page - 1) * limit
  const from = currentCount >= total ? null : currentCount + 1
  const to = !from ? null : from - 1 + limit > total ? total : currentCount + limit

  const data = {
    current_page: page,
    per_page: limit,
    last_page,
    total,
    from,
    to,
    data: await db[model.toString()].findMany(originalOptions),
    // data: await db[model].findMany({
    //   ...omit(options, ['page', 'limit']),
    //   skip: currentCount,
    //   take: limit,
    // }),
  }
  return data
}
