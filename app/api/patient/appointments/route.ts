import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'PATIENT') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const appointments = await db.appointment.findMany({
      where: {
        patientId: session.user.id,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 