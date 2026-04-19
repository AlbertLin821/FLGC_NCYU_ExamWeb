"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg = __importStar(require("pg"));
function warnIfSupabasePoolerConfigLooksWrong(connectionString) {
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
    }
    catch {
        return;
    }
    if (username === 'postgres') {
        console.warn('\n[Prisma] 連線設定警告：已偵測 Supabase Connection Pooler，但使用者名稱為 "postgres"。' +
            '\n請改為與控制台 Connection string 完全相同的「postgres.[專案代號]」，否則集區會回傳「Tenant or user not found」。' +
            '\n說明請見專案根目錄的 supabase_setup.md。\n');
    }
    if (port === '6543' && !connectionString.includes('pgbouncer=true')) {
        console.warn('[Prisma] 建議在 Transaction 模式（埠 6543）的 DATABASE_URL 加上查詢參數 pgbouncer=true，以配合 PgBouncer 與 Prisma。');
    }
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    pool;
    constructor() {
        const conn = process.env.DB_URL || process.env.DATABASE_URL;
        warnIfSupabasePoolerConfigLooksWrong(conn);
        const pool = new pg.Pool({ connectionString: conn });
        const adapter = new adapter_pg_1.PrismaPg(pool);
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
        }
        finally {
            await this.pool.end();
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map