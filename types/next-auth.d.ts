import { Role } from "@/lib/generated/prisma";
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      clinicId?: string | null;
      clinicName?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    clinicId?: string | null;
    clinicName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: Role;
    clinicId?: string | null;
    clinicName?: string | null;
  }
} 