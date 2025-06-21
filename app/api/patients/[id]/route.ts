import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { Medication } from '@prisma/client';

// Define types for protocol structure
interface Injection {
  dayOfPhase: number;
  medicationId: string;
  dosage: string;
  time: string;
}

interface Phase {
  name: string;
  duration: number;
  injections: Injection[];
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const patientId = params.id;

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log(`[API] Fetching patient details for ID: ${patientId}`);
    const patient = await db.user.findUnique({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
      include: {
        protocol: true,
      },
    });

    if (!patient) {
      console.log(`[API] Patient with ID: ${patientId} not found in clinic.`);
      return new NextResponse('Patient not found', { status: 404 });
    }
    console.log(`[API] Found patient: ${patient.name}`);

    // --- Enrich Protocol with Medication Details ---
    let protocolWithMedicationDetails = null;
    if (patient.protocol && patient.protocol.phases) {
      const phases = patient.protocol.phases as unknown as Phase[];
      const medicationIds = phases.flatMap(phase => 
        phase.injections.map(injection => injection.medicationId)
      );
      
      const uniqueMedicationIds = [...new Set(medicationIds.filter((id): id is string => !!id))];

      if (uniqueMedicationIds.length > 0) {
        if (!session?.user?.clinicId) {
          return new NextResponse('User clinic not found', { status: 400 });
        }
        console.log("Unique Medication IDs:", uniqueMedicationIds);
        const medications = await db.medication.findMany({
          where: {
            id: { in: uniqueMedicationIds },
            clinicId: session.user.clinicId, // Security: ensure meds are from the same clinic
          },
        });

        const medicationsMap = new Map(medications.map((med: Medication) => [med.id, med]));

        const enrichedPhases = phases.map(phase => ({
          ...phase,
          injections: phase.injections.map(injection => ({
            ...injection,
            medication: medicationsMap.get(injection.medicationId) || null,
          })),
        }));

        protocolWithMedicationDetails = {
          ...patient.protocol,
          phases: enrichedPhases,
        };
      } else {
        // Protocol has no injections, return as is
        protocolWithMedicationDetails = patient.protocol;
      }
    }
    // --- End Enrichment ---

    console.log(`[API] Fetching documents for patient ID: ${patientId}`);
    const documents = await db.document.findMany({
      where: {
        patientId: patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`[API] Found ${documents.length} documents.`);

    console.log(`[API] Fetching appointments for patient ID: ${patientId}`);
    const appointments = await db.appointment.findMany({
      where: {
        patientId: patientId,
      },
      orderBy: {
        date: 'desc',
      },
    });
    console.log(`[API] Found ${appointments.length} appointments.`);

    const { password, ...patientWithoutPassword } = patient;
    const patientData = { 
      ...patientWithoutPassword, 
      protocol: protocolWithMedicationDetails, // Use the enriched protocol
      documents, 
      appointments 
    };

    console.log("[API] Successfully fetched all data. Returning patientData.");
    return NextResponse.json(patientData);
  } catch (error) {
    console.error(`[API] CRITICAL ERROR fetching patient ${patientId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: errorMessage }), { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const patientId = params.id;

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, dateOfBirth, protocolId, protocolStartDate } = body;

    // First, verify the patient belongs to the admin's clinic
    const patient = await db.user.findUnique({
      where: { id: patientId, clinicId: session.user.clinicId },
    });

    if (!patient) {
      return new NextResponse('Patient not found or not in your clinic', {
        status: 404,
      });
    }

    const dataToUpdate: {
      name?: string;
      email?: string;
      dateOfBirth?: Date | null;
      protocolId?: string | null;
      protocolStartDate?: Date | null;
    } = {};

    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (dateOfBirth) dataToUpdate.dateOfBirth = new Date(dateOfBirth);
    
    if (protocolId) {
        dataToUpdate.protocolId = protocolId;
    }
    if (protocolStartDate) {
        dataToUpdate.protocolStartDate = new Date(protocolStartDate);
    }

    const updatedPatient = await db.user.update({
      where: { id: patientId },
      data: dataToUpdate,
    });
    
    const { password, ...patientWithoutPassword } = updatedPatient;

    return NextResponse.json(patientWithoutPassword);
  } catch (error) {
    console.error(`Error updating patient ${patientId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const patientId = params.id;

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!patientId) {
    return new NextResponse('Patient ID is required', { status: 400 });
  }

  try {
    // First, verify the patient belongs to the admin's clinic
    const patient = await db.user.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.clinicId !== session.user.clinicId) {
      return new NextResponse('Patient not found or not in your clinic', {
        status: 404,
      });
    }

    await db.user.delete({
      where: { id: patientId },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content for successful deletion
  } catch (error) {
    console.error(`Error deleting patient ${patientId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 