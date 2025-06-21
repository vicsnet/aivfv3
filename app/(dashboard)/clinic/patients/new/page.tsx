"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useState } from "react";

export default function NewPatientPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ message: string; setupLink: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess({ message: data.message, setupLink: data.setupLink });
        setFormData({ fullName: "", email: "" });
      } else {
        setError(data.message || "Something went wrong!");
      }
    } catch (error) {
      setError("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Onboard New Patient</h1>
      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>
            Enter the details of the new patient. This will generate a secure
            link for them to set up their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="patient@example.com"
                  required
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Generating Link..." : "Create Patient & Get Setup Link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600">Success!</h3>
                <p>{success.message}</p>
                <p className="font-semibold">Please share this secure link with the patient:</p>
                <div className="rounded-md bg-gray-100 p-3 dark:bg-gray-800">
                    <p className="break-all text-sm font-mono">{success.setupLink}</p>
                </div>
                <Button onClick={() => setSuccess(null)}>Create Another Patient</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
