'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Menu, X, ChevronDown, Linkedin, Instagram } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function LogoNavbar() {
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';
  const usePublicBucket = process.env.NEXT_PUBLIC_S3_PUBLIC_BUCKET === 'true';
  
  // Se bucket for público, gerar URL diretamente (sem fetch)
  const directUrl = useS3 && usePublicBucket
    ? `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'kl-checklist'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com/assets/logo-kl-light.png`
    : null;
  
  const [logoUrl, setLogoUrl] = useState<string>(directUrl || '');

  useEffect(() => {
    // Se já temos URL direta, não precisa fazer fetch
    if (directUrl) {
      setLogoUrl(directUrl);
      return;
    }

    if (useS3) {
      fetch('/api/assets/logo-kl-light.png')
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(url => setLogoUrl(url))
        .catch(() => setLogoUrl('/logo-kl-light.png'));
    } else {
      setLogoUrl('/logo-kl-light.png');
    }
  }, [useS3, usePublicBucket, directUrl]);

  if (!logoUrl) return null;

  return (
    <Image
      src={logoUrl}
      alt="KL Facilities"
      width={48}
      height={48}
      className="relative z-10 overflow-clip"
      unoptimized={useS3}
    />
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Função para scroll suave
  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <LogoNavbar />
              <span className="text-xl font-bold text-[#1a1d5e]">
                KL Facilities
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#servicos"
              onClick={e => handleSmoothScroll(e, '#servicos')}
              className="text-sm font-medium text-slate-600 hover:text-[#1a1d5e] transition-colors"
            >
              Serviços
            </a>
            <a
              href="#parceiros"
              onClick={e => handleSmoothScroll(e, '#parceiros')}
              className="text-sm font-medium text-slate-600 hover:text-[#1a1d5e] transition-colors"
            >
              Parceiros
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#1a1d5e] transition-colors outline-none">
                Sobre
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <a
                    href="#sobre"
                    onClick={e => {
                      handleSmoothScroll(e, '#sobre');
                      e.stopPropagation();
                    }}
                  >
                    Sobre Nós
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cultura">Cultura e Valores</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/estados">Estados de Atuação</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href="#contact"
              onClick={e => handleSmoothScroll(e, '#contact')}
              className="text-sm font-medium text-slate-600 hover:text-[#1a1d5e] transition-colors"
            >
              Contato
            </a>
            <Link
              href="/banco-talentos"
              className="text-sm font-medium text-slate-600 hover:text-[#1a1d5e] transition-colors"
            >
              Trabalhe Conosco
            </Link>
            <Link
              href={session ? '/dashboard' : '/login'}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Portal
            </Link>
            {/* Social Icons */}
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200">
              <a
                href="https://www.linkedin.com/company/86083071/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-[#009ee2] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/klfacilities"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-[#009ee2] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4 space-y-3">
            <a
              href="#servicos"
              onClick={e => handleSmoothScroll(e, '#servicos')}
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors"
            >
              Serviços
            </a>
            <a
              href="#parceiros"
              onClick={e => handleSmoothScroll(e, '#parceiros')}
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors"
            >
              Parceiros
            </a>
            <a
              href="#sobre"
              onClick={e => handleSmoothScroll(e, '#sobre')}
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors"
            >
              Sobre Nós
            </a>
            <Link
              href="/cultura"
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors pl-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cultura e Valores
            </Link>
            <Link
              href="/estados"
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors pl-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Estados de Atuação
            </Link>
            {/* Social Icons Mobile */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-200 mt-3">
              <a
                href="https://www.linkedin.com/company/kl-facilities"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-[#009ee2] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/klfacilities"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-[#009ee2] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <a
              href="#contact"
              onClick={e => handleSmoothScroll(e, '#contact')}
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors"
            >
              Contato
            </a>
            <Link
              href="/banco-talentos"
              className="block text-sm font-medium text-slate-600 hover:text-[#2c2e85] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Trabalhe Conosco
            </Link>
            <Link
              href={session ? '/dashboard' : '/login'}
              className="block text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Portal
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
