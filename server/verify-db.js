const { Client } = require('pg');
require('dotenv').config();

async function testConnection(name, url) {
  console.log(`\n🔍 測試 ${name}...`);
  if (!url) {
    console.log(`❌ 失敗: 未設定 ${name} 環境變數`);
    return false;
  }
  
  // 隱藏密碼印出 URL 供檢查
  const safeUrl = url.replace(/:[^:@]+@/, ':***@');
  console.log(`連線字串格式: ${safeUrl}`);

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ 成功! 連線正常 (伺服器時間: ${res.rows[0].now})`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ 失敗: 無法連線`);
    console.error(`錯誤訊息: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('--- Supabase 資料庫連線測試 ---');
  await testConnection('DIRECT_URL (用於 Schema 推送/遷移)', process.env.DIRECT_URL);
  await testConnection('DATABASE_URL (用於應用程式執行/連線池)', process.env.DATABASE_URL);
  console.log('\n-------------------------------');
}

main();
