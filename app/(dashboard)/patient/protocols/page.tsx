"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, History, CheckCircle, Bot, Smile, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Protocol, Medication } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MermaidDiagram from '@/components/MermaidDiagram';
import { Badge } from '@/components/ui/badge';

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

// This is a client-side representation, so we define it fully
// without extending the base Prisma type to avoid JSON type conflicts.
interface PageProtocol {
    id: string;
    name: string;
    description: string | null;
    clinicId: string;
    startDate: string;
    totalInjections: number;
    completedInjections: number;
    progress: number;
    phases: EnrichedPhase[];
}

interface InjectionCompletion {
    id: string;
    protocolId: string;
    injectionDate: string;
    injectionTime: string;
    mood: string | null;
    moodAnalysis: string | null;
}

const ProtocolHistoryPage = () => {
    const [protocols, setProtocols] = useState<PageProtocol[]>([]);
    const [completions, setCompletions] = useState<InjectionCompletion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiResponse, setAiResponse] = useState({ explanation: "", images: [] as string[], diagram: "" });
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [selectedInjection, setSelectedInjection] = useState<EnrichedInjection | null>(null);
    const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
    const [moodInput, setMoodInput] = useState("");
    const [selectedCompletion, setSelectedCompletion] = useState<InjectionCompletion | null>(null);
    const [selectedMedicationName, setSelectedMedicationName] = useState<string | null>(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState("");


    const fetchAllData = async () => {
        try {
            setIsLoading(true);
            const [protoRes, compRes] = await Promise.all([
                fetch('/api/patient/protocol-history'),
                fetch('/api/patient/injection-completions')
            ]);

            if (!protoRes.ok) {
                throw new Error('Failed to fetch protocol history.');
            }
                if (!compRes.ok) {
                throw new Error('Failed to fetch injection completions.');
            }
            const protocolData = await protoRes.json();
            const completionData = await compRes.json();
            
            setProtocols(protocolData);
            setCompletions(completionData);

            // Automatically expand the most recent protocol
            if (protocolData.length > 0) {
                setExpandedProtocols(new Set([protocolData[0].id]));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const toggleProtocolExpansion = (protocolId: string) => {
        setExpandedProtocols(prev => {
            const newSet = new Set(prev);
            if (newSet.has(protocolId)) {
                newSet.delete(protocolId);
            } else {
                newSet.add(protocolId);
            }
            return newSet;
        });
    };

    const getCompletion = (protocolId: string, injectionDate: Date, injectionTime: string): InjectionCompletion | undefined => {
        const dateString = injectionDate.toISOString().split('T')[0];
        return completions.find(c => 
            c.protocolId === protocolId &&
            c.injectionDate.startsWith(dateString) &&
            c.injectionTime === injectionTime
        );
    };
    
    const handleConfirmInjection = async (protocolId: string, injection: EnrichedInjection, injectionDate: Date) => {
        try {
            const res = await fetch('/api/patient/injection-completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocolId: protocolId,
                    injectionDate: injectionDate.toISOString().split('T')[0],
                    injectionTime: injection.time,
                }),
            });
            if (!res.ok) throw new Error('Failed to confirm injection');
            await fetchAllData(); // Re-fetch all data to update UI
        } catch (error) {
            alert(error instanceof Error ? error.message : 'An error occurred');
        }
    };

    const handleOpenMoodModal = (completion: InjectionCompletion, injection: EnrichedInjection) => {
        setSelectedCompletion(completion);
        setMoodInput(completion.mood || "");
        setSelectedMedicationName(injection.medication?.name || null);
        setIsMoodModalOpen(true);
    };

    const handleLogMood = async () => {
        if (!selectedCompletion || !moodInput) return;

        try {
            const res = await fetch(`/api/patient/injection-completions/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    completionId: selectedCompletion.id,
                    mood: moodInput,
                    medicationName: selectedMedicationName,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to log mood');
            }
            const updatedCompletion = await res.json();
            setIsMoodModalOpen(false);
            await fetchAllData(); 

            if (updatedCompletion.moodAnalysis) {
                setAnalysisResult(updatedCompletion.moodAnalysis);
                setIsAnalysisModalOpen(true);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'An error occurred');
        }
    };

    const handleAskAi = async (injection: EnrichedInjection) => {
        setSelectedInjection(injection);
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiResponse({ explanation: "", images: [], diagram: "" });

        try {
            const res = await fetch('/api/ai/explain-dosage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicationName: injection.medication?.name,
                    dosage: injection.dosage,
                }),
            });

            if (!res.ok) {
                throw new Error('The AI assistant could not be reached.');
            }
            const data = await res.json();
            setAiResponse(data);
        } catch (error) {
            setAiResponse({
                explanation: error instanceof Error ? error.message : 'An unexpected error occurred.',
                images: [],
                diagram: ""
            });
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                </div>
            )
        }

        if (error) {
            return (
                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="flex flex-row items-center space-x-3">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                        <CardTitle className="text-red-800">An Error Occurred</CardTitle>
                    </CardHeader>
                    <CardContent className="text-red-700">
                        <p>{error}</p>
                    </CardContent>
                </Card>
            )
        }

        if (protocols.length === 0) {
            return (
                 <div className="text-center py-12">
                    <History className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Protocol History</h3>
                    <p className="mt-1 text-sm text-gray-500">You have not been assigned any protocols yet.</p>
                </div>
            )
        }

        // Filter out duplicate protocols by id
        const uniqueProtocols = protocols.filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);

        return (
            <div className="space-y-6">
                {uniqueProtocols.map((protocol) => {
                    const isExpanded = expandedProtocols.has(protocol.id);
                    return (
                    <Card key={protocol.id}>
                        <CardHeader className="cursor-pointer" onClick={() => toggleProtocolExpansion(protocol.id)}>
                            <CardTitle className="flex justify-between items-center">
                                <span>{protocol.name}</span>
                                <div className="flex items-center space-x-4">
                                    {protocol.progress === 100 && (
                                        <Badge variant="secondary" className="text-green-600 border-green-600">
                                            <CheckCircle className="h-4 w-4 mr-1.5" />
                                            Completed
                                        </Badge>
                                    )}
                                    <Button variant="ghost" size="sm">
                                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                    </Button>
                                </div>
                            </CardTitle>
                            <CardDescription>
                                Started on {format(new Date(protocol.startDate), 'MMMM d, yyyy')}
                            </CardDescription>
                        </CardHeader>
                         {isExpanded && (
                            <CardContent>
                                <div className="space-y-2 mb-6">
                                    <Progress value={protocol.progress} className="w-full" />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{Math.round(protocol.progress)}% complete</span>
                                        <span>
                                            {protocol.completedInjections} / {protocol.totalInjections} injections
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                {protocol.phases.map((phase, phaseIndex) => {
                                    let phaseStartDay = 0;
                                    for(let i = 0; i < phaseIndex; i++) {
                                        phaseStartDay += protocols.find(p => p.id === protocol.id)!.phases[i].duration;
                                    }

                                    return (
                                    <div key={phase.name} className="p-4 border rounded-lg">
                                        <h4 className="font-bold text-lg mb-2">Phase {phaseIndex + 1}: {phase.name} ({phase.duration} days)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Medication</TableHead>
                                                    <TableHead>Dosage</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Array.from({ length: phase.duration }).map((_, dayIndex) => {
                                                    const dayOfProtocol = phaseStartDay + dayIndex + 1;
                                                    const injectionsForDay = phase.injections.filter(inj => inj.dayOfPhase === dayOfProtocol);
                                                    
                                                    const injectionDate = new Date(protocol.startDate);
                                                    injectionDate.setDate(injectionDate.getDate() + dayOfProtocol - 1);

                                                    return injectionsForDay.map((injection, injIdx) => {
                                                        const completion = getCompletion(protocol.id, injectionDate, injection.time);
                                                        const rowKey = `${protocol.id}-${phaseIndex}-${dayIndex}-${injIdx}`;
                                                        return (
                                                            <TableRow key={rowKey}>
                                                                <TableCell>{format(injectionDate, 'MMM d, yyyy')}</TableCell>
                                                                <TableCell>{injection.time}</TableCell>
                                                                <TableCell>{injection.medication?.name || 'N/A'}</TableCell>
                                                                <TableCell>{injection.dosage}</TableCell>
                                                                <TableCell>
                                                                    {completion ? (
                                                                         <Badge variant="secondary" className="text-green-600 border-green-600">
                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                            Completed
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline">Pending</Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                     <div className="flex items-center justify-end space-x-2">
                                                                        <Button variant="ghost" size="icon" onClick={() => handleAskAi(injection)}>
                                                                            <Bot className="h-4 w-4" />
                                                                        </Button>
                                                                        {completion ? (
                                                                            <Button variant="outline" size="sm" onClick={() => handleOpenMoodModal(completion, injection)}>
                                                                                <Smile className="h-4 w-4 mr-2" />
                                                                                {completion.mood ? 'View Log' : 'Log Mood'}
                                                                            </Button>
                                                                        ) : (
                                                                            <Button size="sm" onClick={() => handleConfirmInjection(protocol.id, injection, injectionDate)}>
                                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                                Complete
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    });
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    )
                                })}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )})}
            </div>
        )
    }


    return (
        <div className="p-4 md:p-6">
            <h1 className="mb-2 text-3xl font-bold">Protocol History</h1>
            <p className="text-lg text-gray-600 mb-6">A complete overview of your assigned treatment protocols.</p>
            {renderContent()}

            {/* AI Explanation Modal */}
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Injection Guide: {selectedInjection?.medication?.name}</DialogTitle>
                        <DialogDescription>
                            A step-by-step guide to administering your injection.
                        </DialogDescription>
                    </DialogHeader>
                    {isAiLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Bot className="h-12 w-12 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {aiResponse.diagram && <MermaidDiagram chart={aiResponse.diagram} />}
                            <p className="text-sm text-muted-foreground leading-relaxed">{aiResponse.explanation}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAiModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mood Logging Modal */}
            <Dialog open={isMoodModalOpen} onOpenChange={setIsMoodModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>How are you feeling?</DialogTitle>
                        <DialogDescription>
                            Log any symptoms or side effects you're experiencing. This will be shared with your clinic.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="mood">Your Symptoms</Label>
                        <Textarea
                            id="mood"
                            placeholder="e.g., I have a slight headache and feel a bit tired."
                            value={moodInput}
                            onChange={(e) => setMoodInput(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMoodModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleLogMood}>Save Log</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Analysis Result Modal */}
            <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Bot size={24} className="text-blue-500" />
                            <span>AI Symptom Analysis</span>
                        </DialogTitle>
                        <DialogDescription className="pt-4 text-base">
                            {analysisResult}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                        <Button type="button" variant="secondary" onClick={() => setIsAnalysisModalOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProtocolHistoryPage; 