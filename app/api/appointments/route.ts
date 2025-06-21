import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!session.user.clinicId) {
    return new NextResponse('User is not associated with a clinic', {
      status: 400,
    });
  }

  try {
    const body = await request.json();
    const { patientId, type, date, notes } = body;

    if (!patientId || !type || !date) {
      return new NextResponse('Missing patientId, type, or date', {
        status: 400,
      });
    }

    // Verify patient exists and belongs to the admin's clinic
    const patient = await db.user.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
        role: 'PATIENT',
      },
    });

    if (!patient) {
      return new NextResponse('Patient not found in your clinic', {
        status: 404,
      });
    }

    const newAppointment = await db.appointment.create({
      data: {
        type,
        date: new Date(date),
        notes,
        patientId,
        clinicId: session.user.clinicId,
      },
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 