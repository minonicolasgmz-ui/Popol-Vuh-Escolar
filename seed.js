const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const stages = [
  { number: 1, title: "La Creación del Mundo", description: "El vacío, el silencio y la decisión de los dioses Tepeu y Gucumatz de formar la Tierra." },
  { number: 2, title: "El Destino de los Animales", description: "La creación de la fauna y su condena a ser alimento por no tener voz para adorar a los creadores." },
  { number: 3, title: "El Hombre de Barro", description: "El primer intento fallido de crear humanidad; seres que se deshacían con el agua y no tenían entendimiento." },
  { number: 4, title: "El Hombre de Madera", description: "El segundo intento fallido; seres sin alma ni memoria que terminan destruidos por un diluvio y por sus propios utensilios." },
  { number: 5, title: "La Caída de Vucub-Caquix", description: "La derrota del dios pájaro arrogante que fingía ser el sol y la luna, castigado por su vanidad." },
  { number: 6, title: "Los Primeros Jugadores en Xibalbá", description: "El viaje de los hermanos Hun-Hunahpú y Vucub-Hunahpú al inframundo, sus derrotas y su sacrificio." },
  { number: 7, title: "El Milagro de la Doncella Ixquic", description: "La historia del árbol de jícaras, el embarazo mágico de Ixquic y su escape a la superficie." },
  { number: 8, title: "La Infancia de los Gemelos Héroes", description: "El nacimiento de Hunahpú e Ixbalanqué, y cómo superan a sus envidiosos hermanastros usando la magia." },
  { number: 9, title: "El Descenso al Inframundo", description: "El viaje de los Gemelos Héroes a Xibalbá y cómo sobreviven a las oscuras pruebas de las distintas 'Casas'." },
  { number: 10, title: "La Derrota de la Muerte", description: "La victoria definitiva de los Gemelos sobre los Señores de Xibalbá y su transformación en el Sol y la Luna." },
  { number: 11, title: "Los Hombres de Maíz", description: "El tercer y definitivo intento de creación; los dioses amasan maíz blanco y amarillo para formar a los verdaderos humanos." },
  { number: 12, title: "El Linaje y el Amanecer", description: "La migración de las tribus Quichés, la espera de la primera salida del sol y el establecimiento de sus pueblos y reyes." },
];

async function seed() {
  for (const stage of stages) {
    await prisma.stage.upsert({
      where: { number: stage.number },
      update: { title: stage.title, description: stage.description },
      create: stage,
    });
  }
  console.log('✅ Seeded 12 stages en Neon PostgreSQL');
  await prisma.$disconnect();
}

seed().catch(console.error);
