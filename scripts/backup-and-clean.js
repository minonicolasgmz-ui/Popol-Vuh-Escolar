require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- 1. Haciendo backup de seguridad ---');
  const groups = await prisma.group.findMany();
  const stages = await prisma.stage.findMany();

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `backup_neon_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ groups, stages }, null, 2), 'utf-8');
  console.log(`Backup guardado exitosamente en: ${backupPath}`);
  console.log(`Equipos respaldados: ${groups.length}`);
  console.log(`Capítulos respaldados: ${stages.length}`);

  console.log('--- 2. Limpiando capítulos y eliminando equipos ---');
  // Desvincular y vaciar capítulos
  const updatedStages = await prisma.stage.updateMany({
    data: {
      groupId: null,
      text: null,
      imageUrl: null,
      audioData: null,
    }
  });
  console.log(`Capítulos reseteados a estado inicial: ${updatedStages.count}`);

  // Eliminar equipos de alumnos
  const deletedGroups = await prisma.group.deleteMany();
  console.log(`Equipos eliminados: ${deletedGroups.count}`);

  console.log('--- 3. Verificando estado final de la base de datos ---');
  const remainingGroups = await prisma.group.count();
  const activeStages = await prisma.stage.count({
    where: {
      OR: [
        { text: { not: null } },
        { imageUrl: { not: null } },
        { audioData: { not: null } },
        { groupId: { not: null } }
      ]
    }
  });
  const totalStages = await prisma.stage.count();

  console.log(`Grupos restantes: ${remainingGroups}`);
  console.log(`Capítulos con contenido o asignados: ${activeStages}`);
  console.log(`Total de capítulos listos para usar: ${totalStages}`);

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Error durante la limpieza:', e);
  await prisma.$disconnect();
  process.exit(1);
});
