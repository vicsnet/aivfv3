"use client";

import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import Link from 'next/link';
import { FileText, CalendarDays, History, Bot, CheckCircle, Smile } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
import type { Medication, Protocol } from '@prisma/client';
import { Progress } from "@/components/ui/progress";

interface Document {
  id: string;
  filename: string;
  fileUrl: string | null;
  createdAt: string;
  notes: string | null;
}

interface Appointment {
  id: string;
  type: string;
  date: string;
  notes: string | null;
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

interface ProtocolHistoryItem {
  id: string;
  name: string;
  description: string | null;
  clinicId: string;
  startDate: string;
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

const PatientDashboard = () => {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [protocolHistory, setProtocolHistory] = useState<ProtocolHistoryItem[]>([]);
  const [completions, setCompletions] = useState<InjectionCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const fetchAllData = async () => {
      try {
      setIsLoading(true);
      const [docsRes, apptsRes, historyRes, compRes] = await Promise.all([
          fetch('/api/patient/documents'),
          fetch('/api/patient/appointments'),
        fetch('/api/patient/protocol-history'),
        fetch('/api/patient/injection-completions'),
        ]);

      if (!docsRes.ok) throw new Error('Failed to fetch documents');
      if (!apptsRes.ok) throw new Error('Failed to fetch appointments');
      if (!historyRes.ok) throw new Error('Failed to fetch protocol history');
      if (!compRes.ok) throw new Error('Failed to fetch injection completions');
      
      setDocuments(await docsRes.json());
      setAppointments(await apptsRes.json());
      setProtocolHistory(await historyRes.json());
      setCompletions(await compRes.json());

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchAllData();
  }, []);

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
        await fetchAllData();
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
    if (!injection.medication?.name || !injection.dosage) {
      alert('Medication name and dosage are required for the injection guide.');
      return;
    }
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

  const getCompletion = (protocolId: string, injectionDate: Date, injectionTime: string): InjectionCompletion | undefined => {
    const dateString = injectionDate.toISOString().split('T')[0];
    return completions.find(c => 
        c.protocolId === protocolId &&
        c.injectionDate.startsWith(dateString) &&
        c.injectionTime === injectionTime
    );
  };

  const renderTodaysProtocol = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the most recent protocol that started on or before today
    const startedProtocols = protocolHistory
      .filter(p => new Date(p.startDate) <= today)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const activeProtocol = startedProtocols[0];

    if (activeProtocol) {
      const protocolStartDate = new Date(activeProtocol.startDate);
      protocolStartDate.setHours(0, 0, 0, 0);
      const dayOfProtocol = Math.ceil((today.getTime() - protocolStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let cumulativeDays = 0;
      let foundPhase = null;
      let phaseIndex = 0;
      for (let i = 0; i < activeProtocol.phases.length; i++) {
        const phase = activeProtocol.phases[i];
        const phaseEndDay = cumulativeDays + phase.duration;
        if (dayOfProtocol > cumulativeDays && dayOfProtocol <= phaseEndDay) {
          foundPhase = phase;
          phaseIndex = i;
          break;
        }
        cumulativeDays += phase.duration;
      }

      if (!foundPhase) {
        return (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{activeProtocol.name}</CardTitle>
              <CardDescription>Protocol complete or no tasks scheduled for today.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No protocol data for today.</p>
              </div>
            </CardContent>
          </Card>
        );
      }

      const dayOfPhase = dayOfProtocol - cumulativeDays;
      const injectionDate = new Date();
      injectionDate.setHours(0,0,0,0);
      const todaysInjections = foundPhase.injections.filter(inj => inj.dayOfPhase === dayOfProtocol);

      // Progress calculation (mimic protocol history page)
      const totalInjections = activeProtocol.phases.reduce((total, phase) => total + phase.injections.length * phase.duration, 0);
      const completedInjections = completions.filter(c => c.protocolId === activeProtocol.id).length;
      const progress = totalInjections > 0 ? Math.min(100, (completedInjections / totalInjections) * 100) : 0;

      return (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{activeProtocol.name}</span>
              {progress === 100 && (
                <Badge variant="secondary" className="text-green-600 border-green-600 ml-2">
                  <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" /> Completed
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Started on {format(new Date(activeProtocol.startDate), 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(progress)}% complete</span>
                <span>
                  {completedInjections} / {totalInjections} injections
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-bold text-lg mb-2">Phase {phaseIndex + 1}: {foundPhase.name} ({foundPhase.duration} days)</h4>
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
                    {todaysInjections.length > 0 ? (
                      todaysInjections.map((injection, injIdx) => {
                        const completion = getCompletion(activeProtocol.id, injectionDate, injection.time);
                        const rowKey = `${activeProtocol.id}-${phaseIndex}-${dayOfPhase - 1}-${injIdx}`;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell>{format(injectionDate, 'MMM d, yyyy')}</TableCell>
                            <TableCell>{injection.time}</TableCell>
                            <TableCell>{injection.medication?.name || 'N/A'}</TableCell>
                            <TableCell>{injection.dosage}</TableCell>
                            <TableCell>
                              {completion ? (
                                <Badge variant="secondary" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleAskAi(injection)} title="Get How To Administer">
                                  <Bot className="h-4 w-4" />
                                </Button>
                                {completion ? (
                                  <Button variant="outline" size="sm" onClick={() => handleOpenMoodModal(completion, injection)}>
                                    <Smile className="h-4 w-4 mr-2" />
                                    Mood Log
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => handleConfirmInjection(activeProtocol.id, injection, injectionDate)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">No injections scheduled for today.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // If no protocol has started yet, show the next protocol's Day 1 tasks
    const futureProtocols = protocolHistory
      .filter(p => new Date(p.startDate) > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const nextProtocol = futureProtocols[0];

    if (nextProtocol) {
      const day1Injections = nextProtocol.phases.flatMap(phase => phase.injections.filter(inj => inj.dayOfPhase === 1));
      const injectionDate = new Date(nextProtocol.startDate);
      injectionDate.setHours(0, 0, 0, 0);
      return (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{nextProtocol.name}</span>
              <Link href="/patient/protocols">
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  View Full History
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Scheduled to start on {format(new Date(nextProtocol.startDate), 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-bold text-lg mb-2">Day 1 Injections</h4>
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
                    {day1Injections.length > 0 ? (
                      day1Injections.map((injection, idx) => {
                        const completion = getCompletion(nextProtocol.id, injectionDate, injection.time);
                        return (
                          <TableRow key={`${nextProtocol.id}-day1-${idx}`}>
                            <TableCell>{format(injectionDate, 'MMM d, yyyy')}</TableCell>
                            <TableCell>{injection.time}</TableCell>
                            <TableCell>{injection.medication?.name || ''}</TableCell>
                            <TableCell>{injection.dosage}</TableCell>
                            <TableCell>
                              {completion ? (
                                <Badge variant="secondary" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleAskAi(injection)} title="Get How To Administer">
                                  <Bot className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleOpenMoodModal(completion || ({} as any), injection)}>
                                  <Smile className="h-4 w-4 mr-2" />
                                  Mood Log
                                </Button>
                                {!completion && (
                                  <Button size="sm" onClick={() => handleConfirmInjection(nextProtocol.id, injection, injectionDate)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">No injections scheduled for Day 1.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // No protocols at all
    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>No Protocols Assigned</CardTitle>
          <CardDescription>Your treatment plan will appear here once assigned.</CardDescription>
        </CardHeader>
      </Card>
    );
  };

  const renderSideCards = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingAppointments = appointments
        .filter(appt => new Date(appt.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const upcomingProtocol = protocolHistory
      .filter(p => new Date(p.startDate) > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    return (
        <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
                    <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
                    {upcomingAppointments.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingAppointments.slice(0, 3).map(appt => (
                          <div key={appt.id} className="flex items-start space-x-4">
                            <div className="flex-shrink-0 pt-1">
                                <CalendarDays className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">{appt.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appt.date), "PPP p")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                    )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
                <CardTitle>My Documents</CardTitle>
                </CardHeader>
                <CardContent>
                {documents.length > 0 ? (
                    <ul className="space-y-2">
                    {documents.slice(0, 3).map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>{doc.filename}</span>
                        </div>
                        </li>
                    ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No documents found.</p>}
                </CardContent>
                <CardFooter>
                    <Link href="/patient/documents" className="w-full">
                    <Button variant="outline" className="w-full">
                        View All Documents
                    </Button>
                </Link>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>My Protocols</CardTitle>
                    <CardDescription>View your treatment history and progress.</CardDescription>
          </CardHeader>
          <CardContent>
                    <Link href="/patient/protocols" className="w-full">
                        <Button variant="outline" className="w-full">
                            <History className="mr-2 h-4 w-4" />
                            View Protocol History
                        </Button>
            </Link>
          </CardContent>
        </Card>
        </div>
    )
  }

  // New: Free-form IVF chat handler
  const handleIvfChat = async (question: string) => {
    if (!question.trim()) return;
    setChatHistory((prev) => [...prev, { role: 'user', content: question }]);
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/ivf-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('Failed to get AI response.');
      const data = await res.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Sorry, there was an error with the AI chat.' }]);
    } finally {
      setIsAiLoading(false);
      setChatInput("");
      chatInputRef.current?.focus();
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {session?.user?.name || 'Patient'}!</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {renderTodaysProtocol()}
            {renderSideCards()}
        </div>

        {/* AI Explanation Modal */}
        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>IVF AI Chat: Ask About Your IVF Journey</DialogTitle>
                    <DialogDescription>
                        This AI assistant answers questions related to IVF, how IVF users feel, and how to administer your medications or injections. Please ask anything about your IVF experience!
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Injection guide still shown if present */}
                  {aiResponse.diagram && <MermaidDiagram chart={aiResponse.diagram} />}
                  {aiResponse.explanation && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiResponse.explanation}</p>
                  )}
                  {/* IVF Chat History */}
                  <div className="bg-muted rounded p-3 max-h-64 overflow-y-auto text-sm" style={{ minHeight: 80 }}>
                    {chatHistory.length === 0 && <div className="text-muted-foreground">Ask any IVF question below!</div>}
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={msg.role === 'user' ? 'text-right mb-2' : 'text-left mb-2'}>
                        <span className={msg.role === 'user' ? 'font-semibold text-primary' : 'font-semibold text-green-700'}>
                          {msg.role === 'user' ? 'You: ' : 'AI: '}
                        </span>
                        <span>{msg.content}</span>
                      </div>
                    ))}
                  </div>
                  <form className="flex gap-2 pt-2" onSubmit={e => { e.preventDefault(); handleIvfChat(chatInput); }}>
                    <input
                      ref={chatInputRef}
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="Type your IVF question..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={isAiLoading}
                    />
                    <Button type="submit" disabled={isAiLoading || !chatInput.trim()}
                      variant="default">Send</Button>
                  </form>
                </div>
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

export default PatientDashboard;
