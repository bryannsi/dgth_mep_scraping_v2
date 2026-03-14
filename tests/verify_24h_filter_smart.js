
import { DbService } from '../src/services/dbService.js';
import { prisma } from '../src/services/prismaClient.js';

async function runVerification() {
  console.log('--- Iniciando Verificación de Filtro de Expiración (SmartDate) ---');

  const testMepIdOld = 'TEST-OLD-CLEAN';
  const testMepIdNew = 'TEST-NEW-CLEAN';
  const testTemplate = 'test_filter_template_clean';

  try {
    // 1. Limpiar datos viejos de prueba si existen
    await prisma.notificationLog.deleteMany({ where: { template: testTemplate } });
    await prisma.vacancy.deleteMany({ where: { mepId: { in: [testMepIdOld, testMepIdNew] } } });

    // 2. Crear una vacante vieja (25 horas atrás)
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.vacancy.create({
      data: {
        mepId: testMepIdOld,
        vacante: 'Vacante Vieja',
        regional: 'PANAMA',
        clasePuesto: 'DOCENTE',
        especialidad: 'MATEMATICAS',
        institucion: 'LICEO TEST',
        lecciones: 10,
        rige: new Date(),
        vence: new Date(),
        bitacoraCreacion: oldDate
      }
    });
    console.log('✅ Vacante vieja creada (25h atrás)');

    // 3. Crear una vacante nueva (10 horas atrás)
    const newDate = new Date(Date.now() - 10 * 60 * 60 * 1000);
    await prisma.vacancy.create({
      data: {
        mepId: testMepIdNew,
        vacante: 'Vacante Nueva',
        regional: 'SAN JOSE',
        clasePuesto: 'DOCENTE',
        especialidad: 'INGLES',
        institucion: 'LICEO TEST 2',
        lecciones: 20,
        rige: new Date(),
        vence: new Date(),
        bitacoraCreacion: newDate
      }
    });
    console.log('✅ Vacante nueva creada (10h atrás)');

    // 4. Ejecutar el método a probar
    const pending = await DbService.getPendingVacanciesByTemplate(testTemplate);
    
    console.log(`🔍 Vacantes devueltas: ${pending.length}`);
    pending.forEach(v => console.log(`   - ID: ${v.mepId}, Creada: ${v.bitacoraCreacion}`));

    // 5. Validaciones
    const hasOld = pending.some(v => v.mepId === testMepIdOld);
    const hasNew = pending.some(v => v.mepId === testMepIdNew);

    if (!hasOld && hasNew) {
      console.log('🚀 RESULTADO: ÉXITO. Solo se devolvió la vacante nueva.');
    } else {
      console.error('❌ RESULTADO: FALLO. El filtro no funcionó correctamente.');
      if (hasOld) console.error('   -> Se incluyó la vacante vieja.');
      if (!hasNew) console.error('   -> No se incluyó la vacante nueva.');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.notificationLog.deleteMany({ where: { template: testTemplate } });
    await prisma.vacancy.deleteMany({ where: { mepId: { in: [testMepIdOld, testMepIdNew] } } });
    await prisma.$disconnect();
    process.exit();
  }
}

runVerification();
