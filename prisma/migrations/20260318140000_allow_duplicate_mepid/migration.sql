-- DropForeignKey
ALTER TABLE "log_notificaciones" DROP CONSTRAINT IF EXISTS "log_notificaciones_mep_id_fkey";

-- DropConstraint
ALTER TABLE "vacantes" DROP CONSTRAINT IF EXISTS "vacantes_mep_id_key";

-- AlterTable
ALTER TABLE "log_notificaciones" ADD COLUMN IF NOT EXISTS "vacante_id" INTEGER;

-- CreateIndex
DROP INDEX IF EXISTS "vacantes_mep_id_regional_clase_puesto_rige_lecciones_key";
CREATE UNIQUE INDEX "vacantes_mep_id_regional_clase_puesto_rige_lecciones_key" ON "vacantes"("mep_id", "regional", "clase_puesto", "rige", "lecciones");

-- AddForeignKey
ALTER TABLE "log_notificaciones" DROP CONSTRAINT IF EXISTS "log_notificaciones_vacante_fkey";
ALTER TABLE "log_notificaciones" ADD CONSTRAINT "log_notificaciones_vacante_fkey" FOREIGN KEY ("vacante_id") REFERENCES "vacantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
