"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Medication {
  id: string;
  name: string;
  description?: string | null;
}

interface EnrichedInjection {
  dayOfPhase: number;
  medicationId: string;
  dosage: string;
  time: string;
  medication: Medication | null;
}

interface EnrichedPhase {
  name: string;
  duration: number;
  injections: EnrichedInjection[];
}

interface EnrichedProtocol {
  id: string;
  name: string;
  description?: string | null;
  phases: EnrichedPhase[];
}

interface Appointment {
  id: string;
  type: string;
  date: string;
  notes: string | null;
}

interface Document {
  id: string;
  filename: string;
  createdAt: string;
  content: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string | null;
  documents: Document[];
  appointments: Appointment[];
  protocolId?: string;
  protocolStartDate?: string;
  protocol?: EnrichedProtocol;
}

const ProtocolView = ({ protocol, startDate }: { protocol: EnrichedProtocol, startDate: string }) => {
  if (!startDate) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Treatment Protocol: {protocol.name}</CardTitle>
          <CardDescription>This protocol is assigned, but a start date has not been set.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const protocolStartDate = new Date(startDate);

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Treatment Protocol: {protocol.name}</CardTitle>
        <CardDescription>
          Start Date: {protocolStartDate.toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {protocol.phases?.map((phase, phaseIndex) => (
          <div key={phaseIndex} className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-lg">Phase {phaseIndex + 1}: {phase.name} ({phase.duration} days)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phase.injections?.length > 0 ? (
                  phase.injections.sort((a, b) => a.dayOfPhase - b.dayOfPhase || a.time.localeCompare(b.time)).map((injection, injIndex) => {
                    const injectionDate = new Date(protocolStartDate);
                    injectionDate.setDate(injectionDate.getDate() + injection.dayOfPhase -1);
                    return (
                      <TableRow key={injIndex}>
                        <TableCell>{injection.dayOfPhase}</TableCell>
                        <TableCell>{injectionDate.toLocaleDateString()}</TableCell>
                        <TableCell>{injection.medication?.name || 'N/A'}</TableCell>
                        <TableCell>{injection.dosage}</TableCell>
                        <TableCell>{injection.time}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">No injections scheduled for this phase.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default function PatientDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [appointmentData, setAppointmentData] = useState({ type: '', date: '', notes: '' });
  const [isBooking, setIsBooking] = useState(false);
  const [protocols, setProtocols] = useState<EnrichedProtocol[]>([]);
  const [assignProtocolData, setAssignProtocolData] = useState({ protocolId: '', startDate: '' });
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchPatientDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to fetch patient details. Status: ${res.status}`);
      }
      const data = await res.json();
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchProtocols = async () => {
    try {
      const res = await fetch('/api/protocols');
      if (!res.ok) {
        throw new Error('Failed to fetch protocols');
      }
      const data = await res.json();
      setProtocols(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
    fetchProtocols();
  }, [id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
      try {
        if (!reader.result) {
          throw new Error("Failed to read file.");
        }
        
        const buffer = Buffer.from(reader.result as ArrayBuffer);
        const fileData = buffer.toString('base64');

            const res = await fetch('/api/documents/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    patientId: id,
                    fileData,
            fileType: file.type,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Upload failed');
            }
            
            setFile(null);
        await fetchPatientDetails(); // Refresh the patient details

        } catch (err) {
            alert(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        alert("Failed to read file.");
        setIsUploading(false);
    };
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appointmentData,
          patientId: id,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to book appointment');
      }
      setAppointmentData({ type: '', date: '', notes: '' }); // Reset form
      await fetchPatientDetails(); // Refresh patient data
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsBooking(false);
    }
  };

  const handleAssignProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignProtocolData.protocolId || !assignProtocolData.startDate) {
      alert('Please select a protocol and a start date.');
        return;
    }
    setIsAssigning(true);
    try {
      // This is the new logic to create a historical record.
      await fetch('/api/patient-protocols', {
        method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
          patientId: id,
                protocolId: assignProtocolData.protocolId,
          startDate: new Date(assignProtocolData.startDate).toISOString(),
            }),
        });

      // This is the existing logic that we are keeping for now.
      const res = await fetch(`/api/patients/${id}/assign-protocol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignProtocolData),
      });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to assign protocol');
        }

        await fetchPatientDetails(); // Refresh patient data
      setAssignProtocolData({ protocolId: '', startDate: '' }); // Reset form
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
        setIsAssigning(false);
    }
  };

  const handleFileView = (content: string) => {
    try {
      const byteCharacters = atob(content.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = content.split(',')[0].split(':')[1].split(';')[0];
      
      const blob = new Blob([byteArray], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);

      window.open(objectUrl, '_blank');
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Could not open the file. It might be corrupted.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div>
      <Link href="/clinic/patients" className="mb-4 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>
      <h1 className="mb-4 text-3xl font-bold">{patient.name}</h1>
      
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p>{patient.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date of Birth</p>
              <p>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not set'}</p>
            </div>
            {patient.protocol && (
              <div>
                <p className="text-sm font-medium text-gray-500">Assigned Protocol</p>
                <p>{patient.protocol.name}</p>
              </div>
            )}
            {patient.protocolStartDate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Protocol Start Date</p>
                <p>{new Date(patient.protocolStartDate).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assign Protocol</CardTitle>
            <CardDescription>Assign a treatment protocol to this patient.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssignProtocol} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="protocol-select">Protocol</Label>
                <Select
                  onValueChange={(value) => setAssignProtocolData({ ...assignProtocolData, protocolId: value })}
                  value={assignProtocolData.protocolId}
                >
                  <SelectTrigger id="protocol-select">
                    <SelectValue placeholder="Select a protocol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {protocols.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Protocol Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={assignProtocolData.startDate}
                  onChange={(e) => setAssignProtocolData({ ...assignProtocolData, startDate: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={isAssigning}>
                {isAssigning ? 'Assigning...' : 'Assign Protocol'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {patient.protocol && (
          <ProtocolView protocol={patient.protocol} startDate={patient.protocolStartDate || ''} />
        )}

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(patient.documents || []).length > 0 ? (
                  patient.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.filename}</TableCell>
                      <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleFileView(doc.content)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No documents found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(patient.appointments || []).length > 0 ? (
                  patient.appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell>{appt.type}</TableCell>
                      <TableCell>{new Date(appt.date).toLocaleString()}</TableCell>
                      <TableCell>{appt.notes}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No upcoming appointments.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input id="file-upload" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
              </div>
              <Button type="submit" disabled={isUploading || !file}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book New Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appointment-type">Type</Label>
                <Input id="appointment-type" value={appointmentData.type} onChange={(e) => setAppointmentData({ ...appointmentData, type: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-date">Date & Time</Label>
                <Input id="appointment-date" type="datetime-local" value={appointmentData.date} onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-notes">Notes</Label>
                <Textarea id="appointment-notes" value={appointmentData.notes} onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })} />
              </div>
              <Button type="submit" disabled={isBooking}>
                {isBooking ? 'Booking...' : 'Book Appointment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}