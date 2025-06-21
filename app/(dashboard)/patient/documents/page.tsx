"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

interface Document {
  id: string;
  filename: string;
  fileUrl: string | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch('/api/patient/documents');
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const handleView = (fileUrl: string | null, filename: string) => {
    if (!fileUrl) return;

    const newTab = window.open();
    if (!newTab) {
      alert('Could not open new tab. Please check your pop-up blocker settings.');
      return;
    }

    if (fileUrl.startsWith('data:image')) {
      newTab.document.title = filename;
      newTab.document.body.style.margin = '0';
      newTab.document.body.innerHTML = `<img src="${fileUrl}" style="display: block; max-width: 100%; height: auto;">`;
    } else if (fileUrl.startsWith('data:application/pdf')) {
      newTab.document.title = filename;
      newTab.document.body.style.margin = '0';
      newTab.document.body.style.height = '100vh';
      newTab.document.body.innerHTML = `<iframe src="${fileUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
    } else {
      newTab.location.href = fileUrl;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.filename}</TableCell>
                    <TableCell>{format(new Date(doc.createdAt), 'PPP')}</TableCell>
                    <TableCell><Badge>Uploaded</Badge></TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        disabled={!doc.fileUrl}
                        onClick={() => handleView(doc.fileUrl, doc.filename)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    You have no documents.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 