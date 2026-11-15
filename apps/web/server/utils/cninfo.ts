export const cninfoHeaders = {
  'User-Agent': 'touyantai-workbench/0.1',
  Referer: 'https://www.cninfo.com.cn/new/index'
}

export function cninfoUrl(config: { cninfoBaseUrl: string }, path: string) {
  return new URL(path, config.cninfoBaseUrl).toString()
}
