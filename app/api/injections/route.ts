import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'CLINIC_ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const clinicId = session.user.clinicId;
  if (!clinicId) {
    return new NextResponse('User is not associated with a clinic', { status: 400 });
  }

  try {
    const body = await request.json();
    const { patientId, protocolId, date, time } = body;

    if (!patientId || !protocolId || !date || !time) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify patient exists and belongs to the admin's clinic
    const patient = await db.user.findFirst({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      return new NextResponse('Patient not found in your clinic', { status: 404 });
    }

    const newInjectionCompletion = await db.injectionCompletion.create({
      data: {
        patientId,
        protocolId,
        injectionDate: new Date(date),
        injectionTime: time,
      },
    });

    return NextResponse.json(newInjectionCompletion, { status: 201 });
  } catch (error) {
    console.error('Error creating injection completion:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
  
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
  
    if (!patientId) {
      return new NextResponse('Patient ID is required', { status: 400 });
    }
  
    // Security check: ensure the user is either the patient themselves or a clinic admin for that patient
    if (session.user.role === 'PATIENT' && session.user.id !== patientId) {
        return new NextResponse('Forbidden', { status: 403 });
    }
    
    if (session.user.role === 'CLINIC_ADMIN') {
        const patient = await db.user.findFirst({ where: { id: patientId, clinicId: session.user.clinicId }});
        if (!patient) {
            return new NextResponse('Patient not found in your clinic', { status: 404 });
        }
    }
  
    try {
      const injections = await db.injectionCompletion.findMany({
        where: { patientId },
        orderBy: { injectionDate: 'asc' },
      });
  
      return NextResponse.json(injections);
    } catch (error) {
      console.error(`Error fetching injection completions for patient ${patientId}:`, error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  } 