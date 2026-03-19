-- DropConstraint
ALTER TABLE "log_notificaciones" DROP CONSTRAINT IF EXISTS "log_notificaciones_mep_id_template_key";

-- AlterTable
ALTER TABLE "log_notificaciones" ALTER COLUMN "vacante_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "log_notificaciones_vacante_id_template_key" ON "log_notificaciones"("vacante_id", "template");
