import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { patientId, protocolId, startDate } = body;

    if (!patientId || !protocolId || !startDate) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const patientProtocol = await db.patientProtocol.create({
      data: {
        patientId,
        protocolId,
        startDate: new Date(startDate),
      },
    });

    return NextResponse.json(patientProtocol, { status: 201 });
  } catch (error) {
    console.error('Error creating patient protocol entry:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 