"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    clinicName: "",
  });
  const [role, setRole] = useState<"CLINIC_ADMIN" | "PATIENT">("CLINIC_ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let dataToSend: any = {
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      role: role,
    };

    if (role === "CLINIC_ADMIN") {
      dataToSend.clinicName = formData.clinicName;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await res.json();
        setError(data.message || "Something went wrong!");
      }
    } catch (error) {
      setError("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md dark:bg-gray-800"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create an Account</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Join AIVF to manage your clinic or track your journey.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>I am a...</Label>
            <RadioGroup
              value={role}
              onValueChange={(value: "CLINIC_ADMIN" | "PATIENT") => setRole(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CLINIC_ADMIN" id="r1" />
                <Label htmlFor="r1">Clinic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PATIENT" id="r2" />
                <Label htmlFor="r2">Patient</Label>
              </div>
            </RadioGroup>
          </div>

          {role === "CLINIC_ADMIN" && (
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                placeholder="Sunshine Fertility Clinic"
                required={role === "CLINIC_ADMIN"}
                value={formData.clinicName}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              required
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="you@example.com"
              required
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              required
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?
            <Link className="font-medium underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
