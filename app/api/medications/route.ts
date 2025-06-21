import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db'; // Import the database client

// Remove the hardcoded list
// const medications = [
//     { id: 'gonal-f', name: 'Gonal-F' },
//     { id: 'menopur', name: 'Menopur' },
//     { id: 'cetrotide', name: 'Cetrotide' },
//     { id: 'ovidrel', name: 'Ovidrel' },
// ];

// GET all medications for the logged-in clinic
export async function GET() {
  const session = await getServerSession(authOptions);

  console.log('[API/MEDICATIONS] Session Data:', session);

  if (session?.user?.role !== 'CLINIC_ADMIN' || !session?.user?.clinicId) {
    console.error('[API/MEDICATIONS] Authorization failed. Role or Clinic ID missing.');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log(`[API/MEDICATIONS] Fetching medications for clinicId: ${session.user.clinicId}`);
    const medications = await db.medication.findMany({
      where: { clinicId: session.user.clinicId },
      orderBy: { name: 'asc' },
    });
    console.log(`[API/MEDICATIONS] Found ${medications.length} medications.`);
    return NextResponse.json(medications);
  } catch (error) {
    console.error('[API/MEDICATIONS] Detailed error:', error);
    if (error instanceof Error) {
      console.error('[API/MEDICATIONS] Error name:', error.name);
      console.error('[API/MEDICATIONS] Error message:', error.message);
      console.error('[API/MEDICATIONS] Error stack:', error.stack);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST a new medication for the logged-in clinic
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== 'CLINIC_ADMIN' || !session?.user?.clinicId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  
    try {
      const body = await request.json();
      const { name, description } = body;
  
      if (!name) {
        return NextResponse.json({ message: 'Medication name is required' }, { status: 400 });
      }

      const clinicExists = await db.clinic.findUnique({
        where: { id: session.user.clinicId },
      });

      if (!clinicExists) {
        return NextResponse.json({ message: 'Your clinic was not found. Please sign out and sign back in.' }, { status: 404 });
      }
  
      const newMedication = await db.medication.create({
        data: {
          name,
          description: description || null,
          clinicId: session.user.clinicId,
        },
      });
  
      return NextResponse.json(newMedication, { status: 201 });
    } catch (error) {
      console.error('Error creating medication:', error);
      // Handle potential unique constraint violation
      if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
          return NextResponse.json({ message: 'A medication with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
} 