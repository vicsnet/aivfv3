import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import db from '@/lib/db';
import { Protocol } from '@prisma/client';

// Define interfaces to match the structure of the JSONB `phases` data
interface Injection {
  dayOfPhase: number;
  medicationId: string;
  dosage: string;
  time: string;
}

interface Phase {
  name: string;
  duration: number; // in days
  injections: Injection[];
}

interface EnrichedProtocol extends Protocol {
    startDate: Date | null;
    totalInjections: number;
    completedInjections: number;
    progress: number;
}

type PatientProtocolWithProtocol = {
    protocol: Protocol;
    id: string;
    patientId: string;
    protocolId: string;
    startDate: Date;
}

async function getProtocolProgress(protocol: Protocol, patientId: string): Promise<Omit<EnrichedProtocol, keyof Protocol | 'startDate'>> {
    const phases = protocol.phases as unknown as Phase[];
    if (!phases || !Array.isArray(phases)) {
        return { totalInjections: 0, completedInjections: 0, progress: 0 };
    }

    // This logic assumes each injection defined in a phase is taken once per day for the phase's duration.
    const totalInjections = phases.reduce((total, phase) => {
        const injectionsForPhase = phase.injections.length * phase.duration;
        return total + injectionsForPhase;
    }, 0);

    if (totalInjections === 0) {
        return { totalInjections: 0, completedInjections: 0, progress: 0 };
    }
    
    const completedInjections = await db.injectionCompletion.count({
        where: {
            patientId: patientId,
            protocolId: protocol.id,
        },
    });

    const progress = totalInjections > 0 ? (completedInjections / totalInjections) * 100 : 0;

    return {
        totalInjections,
        completedInjections,
        progress: Math.min(100, progress), // Cap progress at 100%
    };
}


export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse('Unauthenticated', { status: 401 });
        }

        // --- Start Self-Healing Logic ---
        const currentUser = await db.user.findUnique({
            where: { id: session.user.id },
            select: { protocolId: true, protocolStartDate: true }
        });

        if (currentUser?.protocolId && currentUser.protocolStartDate) {
            const existingRecord = await db.patientProtocol.findFirst({
                where: {
                    patientId: session.user.id,
                    protocolId: currentUser.protocolId,
                    startDate: currentUser.protocolStartDate,
                }
            });

            if (!existingRecord) {
                await db.patientProtocol.create({
                    data: {
                        patientId: session.user.id,
                        protocolId: currentUser.protocolId,
                        startDate: currentUser.protocolStartDate,
                    }
                });
            }
        }
        // --- End Self-Healing Logic ---

        const patientProtocols = await db.patientProtocol.findMany({
            where: { patientId: session.user.id },
            include: { protocol: true },
            orderBy: { startDate: 'desc' },
        });

        if (!patientProtocols || patientProtocols.length === 0) {
            return NextResponse.json([]);
        }

        // --- Enrich all protocols with Medication Details ---
        // Collect all medicationIds from all protocols
        const allPhases = patientProtocols.flatMap(pp => (pp.protocol.phases as unknown as Phase[]));
        const medicationIds = allPhases.flatMap(phase => phase.injections.map(inj => inj.medicationId));
        const uniqueMedicationIds = [...new Set(medicationIds)];
        let medicationsMap = new Map();
        if (uniqueMedicationIds.length > 0) {
            // Assume all protocols are for the same clinic as the patient
            const patientClinicId = patientProtocols[0].protocol.clinicId;
            const medications = await db.medication.findMany({
                where: {
                    id: { in: uniqueMedicationIds },
                    clinicId: patientClinicId,
                },
            });
            medicationsMap = new Map(medications.map((med: any) => [med.id, med]));
        }

        const history = await Promise.all(
            patientProtocols.map(async (pp: PatientProtocolWithProtocol) => {
                // Enrich phases with medication
                const phases = (pp.protocol.phases as unknown as Phase[]).map(phase => ({
                    ...phase,
                    injections: phase.injections.map(injection => ({
                        ...injection,
                        medication: medicationsMap.get(injection.medicationId) || null,
                    })),
                }));
                const progressData = await getProtocolProgress(pp.protocol, session.user.id);
                return {
                    ...pp.protocol,
                    phases,
                    startDate: pp.startDate,
                    ...progressData,
                };
            })
        );

        return NextResponse.json(history);

    } catch (error) {
        console.error("[PROTOCOL_HISTORY_GET]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
} 