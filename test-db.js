const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const group = await prisma.group.create({
      data: {
        student1: 'test',
        student2: 'test2'
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
