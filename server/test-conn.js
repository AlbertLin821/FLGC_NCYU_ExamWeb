const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
  console.log('Testing connection with DATABASE_URL:', process.env.DATABASE_URL);
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  try {
    await prisma.$connect();
    console.log('Successfully connected to Supabase!');
    const count = await prisma.teacher.count();
    console.log('Teacher count:', count);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
