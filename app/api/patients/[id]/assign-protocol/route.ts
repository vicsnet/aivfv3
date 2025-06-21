import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { protocolId, startDate } = body;
    const patientId = params.id;

    if (!protocolId || !startDate) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: {
        id: patientId,
      },
      data: {
        protocolId,
        protocolStartDate: new Date(startDate),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(`Error assigning protocol to patient ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 