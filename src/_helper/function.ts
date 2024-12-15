export const getServer = (req) => req.protocol + '://' + req.get('host')
