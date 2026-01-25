'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Mail, Shield, FileText, Instagram, Linkedin, MessageSquare } from 'lucide-react';

function LogoComponent() {
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
    <div className="flex items-center">
      <Image
        src={logoUrl}
        alt="KL Facilities"
        width={120}
        height={120}
        className="brightness-0 invert overflow-clip"
        priority
        unoptimized={useS3}
      />
    </div>
  );
}

export function Footer() {
  const { data: session } = useSession();
  return (
    <footer className="bg-[#006996] text-white/90 mt-0">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand */}
          <div className="space-y-8">
            <LogoComponent />
            <p className="text-sm leading-6 text-white/90 mt-4 max-w-xs">
              Líder em Limpeza, Facilities e Gestão Operacional. Soluções que
              mantêm sua operação funcionando com qualidade e excelência.
            </p>
          </div>

          {/* Links */}
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Empresa
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href={session ? '/dashboard' : '/login'}
                      className="text-sm leading-6 text-white/90 hover:text-white transition-colors"
                    >
                      Acesso ao ERP
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/banco-talentos"
                      className="text-sm leading-6 text-white/90 hover:text-white transition-colors"
                    >
                      Banco de Talentos
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/chamados"
                      className="text-sm leading-6 text-white/90 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Abertura de Chamados
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Conformidade
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link
                      href="/compliance/privacidade"
                      className="text-sm leading-6 text-white/90 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <Shield className="h-3 w-3" />
                      Privacidade
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/compliance/conformidade"
                      className="text-sm leading-6 text-white/90 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      Conformidade
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-6 text-white">
                Contato
              </h3>
              <ul role="list" className="mt-6 space-y-4">
                <li className="flex items-center gap-2 text-sm leading-6 text-white/90">
                  <Mail className="h-4 w-4" />
                  contato@klfacilities.com.br
                </li>
                <li>
                  <a
                    href="https://instagram.com/klfacilities"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm leading-6 text-white/90 hover:text-white transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    @klfacilities
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/company/86083071/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm leading-6 text-white/90 hover:text-white transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/5541984022907?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20os%20serviços%20da%20KL%20Facilities."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm leading-6 text-white/90 hover:text-white transition-colors"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.98 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    +55 41 98402-2907
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/20 pt-8 sm:mt-20 lg:mt-24 flex items-center justify-between">
          <p className="text-xs leading-5 text-white/90">
            &copy; {new Date().getFullYear()} KL Facilities. Todos os direitos
            reservados.
          </p>
          <p className="text-xs leading-5 text-white/90">
            Desenvolvido por{' '}
            <a
              href="https://dmtn.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-white/90 transition-colors font-medium underline"
            >
              DMTN Sistemas
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
