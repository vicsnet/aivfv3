'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Type definitions matching our Prisma schema
interface Medication {
    id: string;
    name: string;
}

interface Injection {
    dayOfPhase: number;
    medicationId: string;
    dosage: string;
    time: string;
}

interface Phase {
    name: string;
    duration: number;
    injections: Injection[];
}

export default function NewProtocolPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const [protocolName, setProtocolName] = useState('');
    const [protocolDescription, setProtocolDescription] = useState('');
    const [phases, setPhases] = useState<Phase[]>([
        { name: 'Stimulation', duration: 10, injections: [] }
    ]);
    const [medications, setMedications] = useState<Medication[]>([]);
    
    const [isLoadingMeds, setIsLoadingMeds] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchMedications = async () => {
            setIsLoadingMeds(true);
            setError(null);
            try {
                const res = await fetch('/api/medications');
                if (!res.ok) {
                    throw new Error('Could not load medications. Please ensure some exist for your clinic.');
                }
                const data = await res.json();
                setMedications(data);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(errorMessage);
                console.error(err);
            } finally {
                setIsLoadingMeds(false);
            }
        };

        if (session) {
            fetchMedications();
        }
    }, [session]);

    const addPhase = () => {
        setPhases([...phases, { name: '', duration: 1, injections: [] }]);
    };

    const removePhase = (index: number) => {
        setPhases(phases.filter((_, i) => i !== index));
    };

    const handlePhaseChange = (index: number, field: keyof Phase, value: string | number) => {
        const newPhases = [...phases];
        (newPhases[index] as any)[field] = value;
        setPhases(newPhases);
    };

    const addInjection = (phaseIndex: number) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].injections.push({
            dayOfPhase: 1,
            medicationId: '',
            dosage: '',
            time: '09:00'
        });
        setPhases(newPhases);
    };

    const removeInjection = (phaseIndex: number, injIndex: number) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].injections.splice(injIndex, 1);
        setPhases(newPhases);
    };

    const handleInjectionChange = (phaseIndex: number, injIndex: number, field: keyof Injection, value: string | number) => {
        const newPhases = [...phases];
        (newPhases[phaseIndex].injections[injIndex] as any)[field] = value;
        setPhases(newPhases);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        if (!protocolName.trim()) {
            setError('Protocol name is required.');
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/protocols', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: protocolName,
                    description: protocolDescription,
                    phases: phases.map(p => ({
                        ...p,
                        duration: Number(p.duration),
                        injections: p.injections.map(i => ({
                            ...i,
                            dayOfPhase: Number(i.dayOfPhase)
                        }))
                    }))
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create protocol');
            }
            
            router.push('/clinic/patients');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Create New Treatment Protocol</h1>
                <Button type="submit" disabled={isSubmitting || isLoadingMeds || medications.length === 0}>
                    {isSubmitting ? 'Saving...' : 'Save Protocol'}
                </Button>
            </div>

            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
            
            <Card>
                <CardHeader>
                    <CardTitle>Protocol Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="protocolName">Protocol Name</Label>
                        <Input id="protocolName" value={protocolName} onChange={(e) => setProtocolName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="protocolDescription">Description (Optional)</Label>
                        <Textarea id="protocolDescription" value={protocolDescription} onChange={(e) => setProtocolDescription(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Phases</h2>
                <div className="space-y-6">
                    {phases.map((phase, phaseIndex) => (
                        <Card key={phaseIndex} className="relative border-l-4 border-blue-500 p-2">
                             <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-red-500" onClick={() => removePhase(phaseIndex)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <CardHeader>
                                <CardTitle>Phase {phaseIndex + 1}: {phase.name || 'New Phase'}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor={`phase-name-${phaseIndex}`}>Phase Name</Label>
                                        <Input id={`phase-name-${phaseIndex}`} value={phase.name} onChange={(e) => handlePhaseChange(phaseIndex, 'name', e.target.value)} required placeholder="e.g., Stimulation"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`phase-duration-${phaseIndex}`}>Duration (days)</Label>
                                        <Input id={`phase-duration-${phaseIndex}`} type="number" value={phase.duration} onChange={(e) => handlePhaseChange(phaseIndex, 'duration', Number(e.target.value))} required min="1"/>
                                    </div>
                                </div>
                                <div className="pt-4 space-y-2">
                                    <h3 className="font-semibold">Injections</h3>
                                    {isLoadingMeds ? <p>Loading medications...</p> : 
                                     !error && medications.length === 0 ? (
                                        <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                                            <p>No medications found for your clinic.</p>
                                            <p className="mt-2">You must add medications before creating a protocol.</p>
                                            <Link href="/clinic/medications" className="mt-2 inline-block">
                                                <Button variant="link">Add Medications</Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {phase.injections.map((inj, injIndex) => (
                                                <div key={injIndex} className="flex w-full items-end gap-2 rounded-lg border p-4">
                                                    <div className="grid flex-grow grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`inj-day-${phaseIndex}-${injIndex}`}>Day</Label>
                                                            <Input id={`inj-day-${phaseIndex}-${injIndex}`} type="number" value={inj.dayOfPhase} onChange={(e) => handleInjectionChange(phaseIndex, injIndex, 'dayOfPhase', Number(e.target.value))} required min="1" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`inj-med-${phaseIndex}-${injIndex}`}>Medication</Label>
                                                            <Select value={inj.medicationId} onValueChange={(value) => handleInjectionChange(phaseIndex, injIndex, 'medicationId', value)} required>
                                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                                <SelectContent>
                                                                    {medications.map(med => <SelectItem key={med.id} value={med.id}>{med.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`inj-dosage-${phaseIndex}-${injIndex}`}>Dosage</Label>
                                                            <Input id={`inj-dosage-${phaseIndex}-${injIndex}`} value={inj.dosage} onChange={(e) => handleInjectionChange(phaseIndex, injIndex, 'dosage', e.target.value)} required placeholder="e.g., 75 IU"/>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor={`inj-time-${phaseIndex}-${injIndex}`}>Time</Label>
                                                            <Input id={`inj-time-${phaseIndex}-${injIndex}`} type="time" value={inj.time} onChange={(e) => handleInjectionChange(phaseIndex, injIndex, 'time', e.target.value)} required />
                                                        </div>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-red-500" onClick={() => removeInjection(phaseIndex, injIndex)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" className="mt-2" onClick={() => addInjection(phaseIndex)}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Add Injection
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button type="button" variant="secondary" onClick={addPhase} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Phase
                    </Button>
                </div>
            </div>
        </form>
    );
} 