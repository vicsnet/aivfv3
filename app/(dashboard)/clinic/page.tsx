"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Patient {
    id: string;
    name: string;
    email: string;
}

export default function ClinicDashboard() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">
        {session?.user?.clinicName || "Clinic"} Dashboard
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Patients</CardTitle>
            <CardDescription>The number of patients you manage.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{loading ? '...' : patients.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Patients</CardTitle>
              <CardDescription>
                Your 5 most recently added patients.
              </CardDescription>
            </div>
            <Link href="/clinic/patients">
              <Button>View All Patients</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                    </TableRow>
                ) : error ? (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center text-red-500">{error}</TableCell>
                    </TableRow>
                ) : (
                    patients.slice(0, 5).map((patient) => (
                        <TableRow key={patient.id}>
                            <TableCell>{patient.name}</TableCell>
                            <TableCell>{patient.email}</TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
