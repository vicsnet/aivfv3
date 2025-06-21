-- CreateTable
CREATE TABLE "patient_protocols" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_protocols_patientId_protocolId_startDate_key" ON "patient_protocols"("patientId", "protocolId", "startDate");

-- AddForeignKey
ALTER TABLE "patient_protocols" ADD CONSTRAINT "patient_protocols_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_protocols" ADD CONSTRAINT "patient_protocols_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
