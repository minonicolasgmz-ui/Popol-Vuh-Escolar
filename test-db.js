const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/Nico/Documents/Popol-Vuh-Escolar/prisma/db/custom.db'
    }
  }
});
prisma.group.count().then(c => console.log('Count:', c)).catch(console.error).finally(() => prisma.$disconnect());
