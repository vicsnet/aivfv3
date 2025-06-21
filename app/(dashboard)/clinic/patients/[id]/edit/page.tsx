"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Patient {
  name: string;
  email: string;
  dateOfBirth: string | null;
}

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<Patient>({ name: '', email: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchPatientDetails = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/patients/${id}`);
          if (!res.ok) throw new Error('Failed to fetch patient details');
          const data = await res.json();
          setPatient(data);
          setFormData({
            name: data.name,
            email: data.email,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
          setLoading(false);
        }
      };
      fetchPatientDetails();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update patient');
      }

      router.push(`/clinic/patients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div>
      <Link href={`/clinic/patients/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Patient Details
      </Link>
      <h1 className="mb-4 text-3xl font-bold">Edit {patient.name}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Update Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={handleChange} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 