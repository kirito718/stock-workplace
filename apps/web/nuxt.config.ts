export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  typescript: { strict: true, typeCheck: false },
  runtimeConfig: {
    cninfoBaseUrl: process.env.CNINFO_BASE_URL || 'https://www.cninfo.com.cn'
  }
})
