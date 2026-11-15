import { cninfoHeaders, cninfoUrl } from '../../utils/cninfo'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const response = await $fetch(cninfoUrl(config, '/new/data/szse_stock.json'), {
    headers: cninfoHeaders
  })
  return response
})
