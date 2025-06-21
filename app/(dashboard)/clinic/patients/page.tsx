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
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Patient {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string | null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/patients");
        if (!res.ok) {
          throw new Error("Failed to fetch patients");
        }
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleViewDetails = (patientId: string) => {
    router.push(`/clinic/patients/${patientId}`);
  };

  const handleEdit = (patientId: string) => {
    router.push(`/clinic/patients/${patientId}/edit`);
  };

  const handleDelete = async (patientId: string) => {
    if (!window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete patient');
      }

      // Remove patient from the list in the UI
      setPatients((prevPatients) => prevPatients.filter((p) => p.id !== patientId));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while deleting.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        <Link href="/clinic/patients/new">
          <Button>Add Patient</Button>
        </Link>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No patients found.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>
                      {patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString()
                        : "N/A"}
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
                          <DropdownMenuItem onClick={() => handleViewDetails(patient.id)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(patient.id)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(patient.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
