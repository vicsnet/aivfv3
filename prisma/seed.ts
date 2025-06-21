import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create a clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'AIVF Clinic',
    },
  });
  console.log(`Created clinic: ${clinic.name}`);

  // Create an admin user
  const adminPassword = 'password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@aivf.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'CLINIC_ADMIN',
      clinicId: clinic.id,
      emailVerified: new Date(),
    },
  });

  console.log(`Created admin user: ${admin.email} with password: ${adminPassword}`);
  
  // Create a patient user
  const patientPassword = 'password123';
  const hashedPatientPassword = await bcrypt.hash(patientPassword, 10);

  const patient = await prisma.user.create({
      data: {
          email: 'patient@aivf.com',
          name: 'Patient User',
          password: hashedPatientPassword,
          role: 'PATIENT',
          clinicId: clinic.id,
          emailVerified: new Date(),
      }
  });

  console.log(`Created patient user: ${patient.email} with password: ${patientPassword}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 