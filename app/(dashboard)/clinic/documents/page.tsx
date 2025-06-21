"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";

interface Patient {
  id: string;
  name: string;
}

interface Document {
  id: string;
  filename: string;
  content: string;
  createdAt: string;
  uploadedBy: {
    name: string;
  };
}

export default function DocumentsPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const patientsRes = await fetch("/api/patients");
        if (!patientsRes.ok) throw new Error("Failed to fetch patients");
        const patientsData = await patientsRes.json();
        setPatients(patientsData);

        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleFileDownload = (content: string, filename: string) => {
    const link = document.createElement("a");
    link.href = content;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedPatient) {
      setError("Please select a patient and a file.");
      return;
    }
    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const fileData = reader.result;
      if (typeof fileData !== 'string') {
        setError("Failed to read file data as a string.");
        setUploading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/documents/upload`,
          {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              patientId: selectedPatient,
              fileData,
            }),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Upload failed");
        }
        
        // Reset form
        setFile(null);
        setSelectedPatient("");
        if (inputFileRef.current) {
          inputFileRef.current.value = "";
        }

        // Refresh documents
        await fetchDocuments();

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setUploading(false);
    };
  };

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Medical Documents</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Upload a patient's medical document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient-select">Select Patient</Label>
                <Select
                  value={selectedPatient}
                  onValueChange={setSelectedPatient}
                >
                  <SelectTrigger id="patient-select">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-upload">Document File</Label>
                <Input
                  id="document-upload"
                  type="file"
                  ref={inputFileRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload and Process'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recently Uploaded</CardTitle>
            <CardDescription>
              Documents that have been recently uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading documents...</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.filename}</TableCell>
                    <TableCell>{doc.uploadedBy.name}</TableCell>
                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleFileDownload(doc.content, doc.filename)}>
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
