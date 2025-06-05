"use client";

import { AppHeader } from "@/app/components/header";
import SessionProviderWrapper from "@/app/components/SessionProviderWrapper";
import { usePathname } from 'next/navigation';
import React from 'react';
import './styles/globals.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/pages/login' ; // Add other auth pages if needed

  return (
    <html lang="en">
      <body className="bg-gray-100">
        <SessionProviderWrapper>
          {!isAuthPage && <AppHeader />}
          <main className="min-h-screen">
            {children}
          </main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}