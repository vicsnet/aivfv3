import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./output.css";
import AuthProvider from "@/components/auth-provider";
import '@/lib/cron'; // Import to start the cron job

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIVF - Modern Fertility Care",
  description: "A SaaS platform for fertility clinics and patients.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
