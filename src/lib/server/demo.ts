import { randomUUID } from 'node:crypto';

export interface GroupRecord { id: string; student1: string; student2: string; createdAt: Date }
export interface StageRecord {
  id: string; number: number; title: string; description: string; text: string | null;
  imageUrl: string | null; audioData: string | null; groupId: string | null; createdAt: Date; updatedAt: Date;
}
interface DemoState { groups: Map<string, GroupRecord>; stages: Map<string, StageRecord> }
const demoGlobal = globalThis as typeof globalThis & { popolDemoData?: DemoState };

function artwork(number: number) {
  const palettes = [['#133f34', '#daaf62'], ['#194859', '#e4b978'], ['#423c62', '#edcb7e'], ['#34452d', '#d1b15c']];
  const [ink, gold] = palettes[(number - 1) % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 1000 1250"><rect width="1000" height="1250" fill="${ink}"/><circle cx="690" cy="300" r="170" fill="${gold}"/><path d="M0 850L280 370L570 890L780 620L1000 850V1250H0Z" fill="#0c2928"/><path d="M0 1000Q250 760 500 990T1000 960V1250H0Z" fill="${gold}" opacity=".32"/><path d="M490 1080V720M490 880Q300 800 345 680Q500 755 490 880M490 950Q690 800 660 715Q490 820 490 950" stroke="${gold}" stroke-width="12" fill="none"/><path d="M40 50H960V1200H40Z" fill="none" stroke="${gold}" stroke-width="2" opacity=".5"/><g fill="${gold}" opacity=".65"><circle cx="145" cy="215" r="4"/><circle cx="310" cy="150" r="3"/><circle cx="410" cy="290" r="5"/><circle cx="850" cy="510" r="4"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function sampleAudio() {
  // Quiet two-note WAV fixture, deliberately not a fabricated student recording.
  const rate = 16000, samples = rate * 2;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / rate, envelope = Math.min(1, t * 12) * Math.min(1, (2 - t) * 12);
    wav.writeInt16LE(Math.round(Math.sin(t * Math.PI * 2 * (t < 1 ? 392 : 523.25)) * 1800 * envelope), 44 + i * 2);
  }
  return `data:audio/wav;base64,${wav.toString('base64')}`;
}

export function demoState(): DemoState {
  if (demoGlobal.popolDemoData) return demoGlobal.popolDemoData;
  const createdAt = new Date('2026-09-01T12:00:00.000Z');
  const titles = ['El comienzo del mundo', 'Los primeros intentos de creación', 'Los hombres de madera', 'Los gemelos y el juego de pelota', 'El camino a Xibalbá', 'Las pruebas de los gemelos', 'La creación de los seres de maíz', 'La memoria de un pueblo'];
  const paragraphs = [
    'Al principio todo estaba en silencio. El cielo y el agua ocupaban el espacio, y todavía no había personas, animales ni árboles. Los creadores conversaron y pensaron cómo dar vida al mundo. La tierra apareció entre las aguas y, sobre ella, crecieron montañas, valles y bosques.\n\nEste comienzo nos invita a imaginar un mundo que nace de la palabra y del encuentro. En nuestra ilustración elegimos representar las montañas junto al agua, iluminadas por un cielo nuevo.',
    'Los creadores buscaron seres capaces de hablar y de recordar su origen. Primero aparecieron los animales, pero sus sonidos eran distintos de las palabras humanas. Después intentaron formar personas de barro. Eran frágiles: el agua las deshacía y no podían sostenerse.\n\nCada intento muestra una búsqueda. Para nosotros, el capítulo habla de aprender de los errores y volver a crear con paciencia.',
    'Los seres de madera podían caminar y hablar, pero no tenían memoria de quienes les habían dado vida. Su historia muestra que existir también implica reconocer a los demás y cuidar el mundo compartido.\n\nAl resumir este capítulo pensamos en la diferencia entre repetir palabras y comprender lo que significan. La memoria y el respeto aparecen como parte de lo que nos hace humanos.',
    'Los gemelos atraviesan desafíos que ponen a prueba su inteligencia y su capacidad de trabajar juntos. El juego de pelota es parte del vínculo entre los distintos mundos del relato.\n\nEn nuestro resumen destacamos que la fuerza no resuelve todas las dificultades: también hacen falta atención, creatividad y colaboración. Esta es una adaptación de demostración, con nombres ficticios y un audio de prueba de dos notas.'
  ];
  const groups = new Map<string, GroupRecord>();
  const stages = new Map<string, StageRecord>();
  titles.forEach((title, index) => {
    const number = index + 1, groupId = index < 4 ? `demo-equipo-${number}` : null;
    if (groupId) groups.set(groupId, { id: groupId, student1: ['Alma', 'Luz', 'Mora', 'Sol'][index], student2: ['Leo', 'Teo', 'Nico', 'Alex'][index], createdAt });
    stages.set(`demo-capitulo-${number}`, { id: `demo-capitulo-${number}`, number, title, description: 'Lean el capítulo, escriban un resumen con sus palabras, elijan una ilustración y graben su lectura.', text: paragraphs[index] ?? null, imageUrl: index < 4 ? artwork(number) : null, audioData: index === 3 ? sampleAudio() : null, groupId, createdAt, updatedAt: createdAt });
  });
  demoGlobal.popolDemoData = { groups, stages };
  return demoGlobal.popolDemoData;
}

export function createDemoGroup(student1: string, student2: string) {
  const group = { id: `demo-${randomUUID()}`, student1, student2, createdAt: new Date() };
  demoState().groups.set(group.id, group);
  return group;
}
