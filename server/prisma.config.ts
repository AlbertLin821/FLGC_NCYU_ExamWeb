import 'dotenv/config'
import { defineConfig, env } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL') || env('DB_URL') || env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
})
