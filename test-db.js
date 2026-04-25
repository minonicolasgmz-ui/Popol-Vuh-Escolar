const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'db', 'custom.db');
console.log("Testing path:", dbPath);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function main() {
  try {
    const group = await prisma.group.create({
      data: {
        student1: 'test-abs-path',
        student2: 'test2-abs-path'
      }
    });
    console.log("Success:", group);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
