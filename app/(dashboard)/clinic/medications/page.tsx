'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';

interface Medication {
    id: string;
    name: string;
    description: string | null;
}

export default function MedicationsPage() {
    const { data: session } = useSession();
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newMedicationName, setNewMedicationName] = useState('');
    const [newMedicationDescription, setNewMedicationDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchMedications = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/medications');
            if (!res.ok) throw new Error('Failed to fetch medications.');
            const data = await res.json();
            setMedications(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchMedications();
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/medications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newMedicationName, description: newMedicationDescription }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to add medication.');
            }

            setNewMedicationName('');
            setNewMedicationDescription('');
            await fetchMedications(); // Refresh the list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Medication List</CardTitle>
                        <CardDescription>All medications available for your clinic.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : error ? (
                                     <TableRow>
                                        <TableCell colSpan={2} className="text-center text-red-500">{error}</TableCell>
                                    </TableRow>
                                ) : medications.length > 0 ? (
                                    medications.map((med) => (
                                        <TableRow key={med.id}>
                                            <TableCell className="font-medium">{med.name}</TableCell>
                                            <TableCell>{med.description || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No medications found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Medication</CardTitle>
                        <CardDescription>Add a new medication to your clinic's list.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="medicationName">Medication Name</Label>
                                <Input
                                    id="medicationName"
                                    value={newMedicationName}
                                    onChange={(e) => setNewMedicationName(e.target.value)}
                                    required
                                    placeholder="e.g., Gonal-f"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="medicationDescription">Description (Optional)</Label>
                                <Textarea
                                    id="medicationDescription"
                                    value={newMedicationDescription}
                                    onChange={(e) => setNewMedicationDescription(e.target.value)}
                                    placeholder="e.g., A brand of follicle-stimulating hormone."
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {isSubmitting ? 'Adding...' : 'Add Medication'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 