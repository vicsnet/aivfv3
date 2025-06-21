import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// Get all protocol templates for the current clinic
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clinicId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const protocols = await db.protocol.findMany({
      where: { clinicId: session.user.clinicId },
    });
    return NextResponse.json(protocols);
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Create a new protocol template
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN' || !session?.user?.clinicId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const clinicId = session.user.clinicId;

  try {
    const body = await request.json();
    const { name, description, phases } = body;

    // Basic validation
    if (!name || !Array.isArray(phases) || phases.length === 0) {
      return new NextResponse('Missing required fields: name and at least one phase are required.', { status: 400 });
    }

    const newProtocol = await db.protocol.create({
      data: {
        name,
        description,
        clinicId: clinicId,
        phases: phases, // Store the whole phases array as JSON
      },
    });

    return NextResponse.json(newProtocol, { status: 201 });
  } catch (error) {
    console.error('Error creating protocol:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 