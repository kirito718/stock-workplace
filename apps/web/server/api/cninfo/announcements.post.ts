import { cninfoHeaders, cninfoUrl } from '../../utils/cninfo'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<Record<string, string> | string>(event)
  const params = new URLSearchParams(typeof body === 'string' ? body : (body || {}))
  const response = await $fetch(cninfoUrl(config, '/new/hisAnnouncement/query'), {
    method: 'POST',
    headers: {
      ...cninfoHeaders,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: params.toString()
  })
  return response
})
