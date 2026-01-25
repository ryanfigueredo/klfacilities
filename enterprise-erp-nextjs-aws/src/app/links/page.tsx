'use client';

import {
  ExternalLink,
  Briefcase,
  Globe,
  MessageSquare,
  Instagram,
  Linkedin,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface LinkItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  accentColor: string;
  borderGlow: string;
}

export default function LinksPage() {
  const links: LinkItem[] = [
    {
      title: 'Banco de Talentos',
      description: 'Cadastre seu currículo e venha trabalhar conosco',
      href: '/banco-talentos',
      icon: <Briefcase className="h-6 w-6" />,
      accentColor: 'blue',
      borderGlow: 'rgba(59, 130, 246, 0.5)',
    },
    {
      title: 'Site Comercial',
      description: 'Conheça nossos serviços e soluções',
      href: '/',
      icon: <Globe className="h-6 w-6" />,
      accentColor: 'cyan',
      borderGlow: 'rgba(6, 182, 212, 0.5)',
    },
    {
      title: 'Central de Atendimento',
      description:
        'Canal direto para colaboradores (Elogios, Sugestões, Denúncias)',
      href: '/colaborador',
      icon: <MessageSquare className="h-6 w-6" />,
      accentColor: 'purple',
      borderGlow: 'rgba(168, 85, 247, 0.5)',
    },
    {
      title: 'Instagram',
      description: 'Acompanhe nosso dia a dia @klfacilities',
      href: 'https://instagram.com/klfacilities',
      icon: <Instagram className="h-6 w-6" />,
      accentColor: 'pink',
      borderGlow: 'rgba(236, 72, 153, 0.5)',
    },
    {
      title: 'LinkedIn',
      description: 'Conecte-se conosco profissionalmente',
      href: 'https://www.linkedin.com/company/86083071/',
      icon: <Linkedin className="h-6 w-6" />,
      accentColor: 'blue',
      borderGlow: 'rgba(37, 99, 235, 0.5)',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background - Azul Claro KL */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-cyan-50 to-[#009ee2]/20 animate-gradient-shift" />

      {/* Animated Blobs - Tons de Azul Claro */}
      <div className="fixed top-0 -left-4 w-72 h-72 bg-[#009ee2]/30 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
      <div className="fixed top-0 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="fixed -bottom-8 left-20 w-72 h-72 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob animation-delay-4000" />

      <div className="relative z-10">
        {/* Header com Logo - Glassmorphism */}
        <div className="flex flex-col items-center pt-16 pb-10 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-xl rounded-full blur-xl opacity-50" />
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-xl max-w-sm w-full">
            <h1 className="text-3xl font-bold text-[#006996] mb-2 text-center drop-shadow-sm">
              KL Facilities
            </h1>
            <p className="text-slate-700 text-center text-sm leading-relaxed">
              Limpeza técnica, facilities e gestão operacional
            </p>
            <p className="text-slate-600 text-xs text-center mt-2">
              Mais de 30 cidades atendidas
            </p>
          </div>
        </div>

        {/* Links Cards - Glassmorphism */}
        <div className="max-w-md mx-auto px-4 pb-12 space-y-4">
          {links.map((link, index) => {
            const isExternal = link.href.startsWith('http');

            return (
              <Link
                key={index}
                href={link.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="block group"
              >
                <div
                  className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-xl hover:bg-white/90 hover:border-white/60 hover:shadow-2xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out active:scale-[0.98] overflow-hidden"
                  style={{
                    boxShadow: `0 8px 32px 0 rgba(0, 158, 226, 0.2), 0 0 0 1px ${link.borderGlow} inset, 0 0 20px -5px ${link.borderGlow}`,
                  }}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  <div className="relative flex items-center gap-4">
                    <div
                      className="flex-shrink-0 w-14 h-14 bg-[#009ee2]/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-[#009ee2]/30 shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{
                        boxShadow: `0 0 20px ${link.borderGlow}`,
                      }}
                    >
                      <div className="text-[#006996] drop-shadow-sm">
                        {link.icon}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-[#006996] drop-shadow-sm">
                          {link.title}
                        </h3>
                        {isExternal && (
                          <ExternalLink className="h-4 w-4 text-[#009ee2] flex-shrink-0 group-hover:text-[#006996] group-hover:scale-110 transition-all" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer - Glassmorphism */}
        <div className="max-w-md mx-auto px-4 pb-8">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/30 text-center shadow-lg">
            <p className="text-sm text-slate-600 space-y-1">
              <span className="block">© 2025 KL Facilities</span>
              <span className="text-xs text-slate-500">
                Todos os direitos reservados
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
    </div>
  );
}
