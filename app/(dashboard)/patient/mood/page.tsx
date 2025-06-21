"use client";

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Bot, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface InjectionCompletion {
    id: string;
    injectionDate: string;
    injectionTime: string;
    mood: string | null;
    moodAnalysis: string | null;
}

const MoodTrackingPage = () => {
    const [completions, setCompletions] = useState<InjectionCompletion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompletions = async () => {
            try {
                setIsLoading(true);
                const res = await fetch('/api/patient/injection-completions');
                if (!res.ok) {
                    throw new Error('Failed to fetch symptom logs.');
                }
                const data = await res.json();
                // Filter for completions that have a mood log and sort them reverse chronologically
                setCompletions(data.filter((c: InjectionCompletion) => c.mood).sort((a: InjectionCompletion, b: InjectionCompletion) => new Date(b.injectionDate).getTime() - new Date(a.injectionDate).getTime()));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCompletions();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return <p>Loading symptom history...</p>;
        }

        if (error) {
            return <p className="text-red-500">Error: {error}</p>;
        }

        if (completions.length === 0) {
            return (
                <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No symptom logs found</h3>
                    <p className="mt-1 text-sm text-gray-500">You haven't logged any symptoms yet. You can do so from your dashboard after confirming an injection.</p>
                </div>
            );
        }

  return (
            <div className="space-y-6">
                {completions.map((completion) => (
                    <Card key={completion.id}>
          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center">
                                    <Calendar className="mr-2 h-5 w-5" />
                                    {format(new Date(completion.injectionDate), 'PPPP')}
                                </span>
                                <Badge variant="outline">{completion.injectionTime}</Badge>
                            </CardTitle>
          </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-md mb-2">Your Log:</h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{completion.mood}</p>
                            </div>
                            {completion.moodAnalysis && (
                                <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                                    <h4 className="font-semibold text-md mb-2 flex items-center text-blue-800">
                                        <Bot className="mr-2 h-5 w-5" />
                                        AI Analysis
                                    </h4>
                                    <p className="text-blue-700">{completion.moodAnalysis}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
              ))}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6">
            <h1 className="mb-2 text-3xl font-bold">Symptom History</h1>
            <p className="text-lg text-gray-600 mb-6">A record of your logged symptoms and AI-powered analysis.</p>
            {renderContent()}
    </div>
  );
};

export default MoodTrackingPage;
