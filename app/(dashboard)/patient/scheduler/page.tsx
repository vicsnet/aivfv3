"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface Appointment {
  id: string;
  title: string;
  date: Date;
  notes: string | null;
}

export default function SchedulerPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/patient/appointments');
        if (!res.ok) throw new Error('Failed to fetch appointments');
        const data = await res.json();
        // Convert date strings to Date objects
        const formattedData = data.map((appt: any) => ({ ...appt, date: new Date(appt.date) }));
        setAppointments(formattedData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const selectedDayAppointments = appointments.filter(
    (appt) => selectedDate && appt.date.toDateString() === selectedDate.toDateString()
  );

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Appointment Scheduler</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to see your appointments.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ booked: appointments.map(a => a.date) }}
              modifiersStyles={{
                booked: {
                  color: '#fff',
                  backgroundColor: '#000',
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Appointments for {selectedDate ? selectedDate.toLocaleDateString() : 'the selected date'}
            </CardTitle>
            <CardDescription>
              Here are your appointments for the selected day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : selectedDayAppointments.length > 0 ? (
              <ul className="space-y-4">
                {selectedDayAppointments.map(appt => (
                  <li key={appt.id} className="rounded-lg border p-4">
                    <p className="font-semibold">{appt.title}</p>
                    <p className="text-sm text-gray-500">{appt.date.toLocaleTimeString()}</p>
                    {appt.notes && <p className="mt-2 text-sm">{appt.notes}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No appointments for this day.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
