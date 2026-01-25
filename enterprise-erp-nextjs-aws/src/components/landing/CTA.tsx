'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LoginButton } from '@/components/auth/LoginButton';

interface CTAProps {
  isLoggedIn: boolean;
}

export function CTA({ isLoggedIn }: CTAProps) {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-r from-primary via-primary/95 to-secondary">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pronto para transformar sua gestão?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/90">
            Comece hoje mesmo e descubra como a tecnologia pode simplificar e
            potencializar os resultados da sua empresa.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 flex-col sm:flex-row gap-y-4">
            {isLoggedIn ? (
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 text-base px-8"
              >
                <Link href="/dashboard">
                  Acessar Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="bg-white rounded-lg p-1">
                <LoginButton />
              </div>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 text-base px-8 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            >
              <Link href="/compliance/privacidade" className="inline-flex items-center">
                <FileText className="h-4 w-4" />
                Política de Privacidade
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

