import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';

/** Supavisor 在使用者名稱或專案代號不符時會回傳此錯誤，與資料表內是否有老師帳號無關。 */
function warnIfSupabasePoolerConfigLooksWrong(connectionString: string | undefined): void {
  if (!connectionString || process.env.NODE_ENV === 'production') {
    return;
  }
  if (!connectionString.includes('pooler.supabase')) {
    return;
  }
  let username = '';
  let port = '';
  try {
    const normalized = connectionString.trim().replace(/^postgres(ql)?:\/\//i, 'http://');
    const u = new URL(normalized);
    username = decodeURIComponent(u.username);
    port = u.port;
  } catch {
    return;
  }
  if (username === 'postgres') {
    console.warn(
      '\n[Prisma] 連線設定警告：已偵測 Supabase Connection Pooler，但使用者名稱為 "postgres"。' +
        '\n請改為與控制台 Connection string 完全相同的「postgres.[專案代號]」，否則集區會回傳「Tenant or user not found」。' +
        '\n說明請見專案根目錄的 supabase_setup.md。\n',
    );
  }
  if (port === '6543' && !connectionString.includes('pgbouncer=true')) {
    console.warn(
      '[Prisma] 建議在 Transaction 模式（埠 6543）的 DATABASE_URL 加上查詢參數 pgbouncer=true，以配合 PgBouncer 與 Prisma。',
    );
  }
}

function resolvePoolMax(): number {
  const raw = Number(process.env.DB_POOL_MAX || process.env.PGPOOL_MAX || '');
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw);
  }
  return process.env.NODE_ENV === 'production' ? 40 : 10;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor() {
    const conn = process.env.DB_URL || process.env.DATABASE_URL;
    warnIfSupabasePoolerConfigLooksWrong(conn);
    const pool = new pg.Pool({
      connectionString: conn,
      max: resolvePoolMax(),
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter: adapter,
    });
    this.pool = pool;
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } finally {
      await this.pool.end();
    }
  }
}
