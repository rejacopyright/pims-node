export const getServer = (req) => req.protocol + '://' + req.get('host')
export const toCapitalize = (text?: string) =>
  text?.replace(/(?:^|\s)\S/g, (a: any) => a?.toUpperCase())
