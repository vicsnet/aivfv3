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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const patient = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        protocol: true,
      },
    });

    if (!patient) {
      return new NextResponse('Patient not found', { status: 404 });
    }

    // --- Enrich Protocol with Medication Details ---
    let protocolWithMedicationDetails = null;
    if (patient.protocol && patient.protocol.phases) {
        const phases = patient.protocol.phases as unknown as Phase[];
        const medicationIds = phases.flatMap(phase => 
            phase.injections.map(injection => injection.medicationId)
        );
        
        const uniqueMedicationIds = [...new Set(medicationIds)];

        if (uniqueMedicationIds.length > 0 && patient.clinicId) {
            const medications = await db.medication.findMany({
                where: {
                    id: { in: uniqueMedicationIds },
                    // Assuming patient and medications are linked via clinic
                    clinicId: patient.clinicId, 
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
            protocolWithMedicationDetails = patient.protocol;
        }
    }
    // --- End Enrichment ---

    const patientData = { 
      protocol: protocolWithMedicationDetails,
      protocolStartDate: patient.protocolStartDate
    };

    return NextResponse.json(patientData);
  } catch (error) {
    console.error(`[API] CRITICAL ERROR fetching protocol for patient ${session.user.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: errorMessage }), { status: 500 });
  }
} 