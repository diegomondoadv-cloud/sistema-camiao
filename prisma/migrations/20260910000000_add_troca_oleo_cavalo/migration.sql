-- AlterTable
ALTER TABLE "cavalos" ADD COLUMN     "data_ultima_troca_oleo" TIMESTAMP(3),
ADD COLUMN     "intervalo_oleo_km" INTEGER,
ADD COLUMN     "km_ultima_troca_oleo" INTEGER;

