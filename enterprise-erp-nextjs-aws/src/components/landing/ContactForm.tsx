'use client';

import React, { useState } from 'react';
import { Send, Phone, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Aqui você pode integrar com uma API de envio de email ou WhatsApp
      const whatsappMessage = `Olá! Meu nome é ${formData.name}, da empresa ${formData.company}. ${formData.message} Email: ${formData.email} | Telefone: ${formData.phone}`;
      const whatsappUrl = `https://wa.me/5541984022907?text=${encodeURIComponent(whatsappMessage)}`;
      
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: 'Mensagem enviada!',
        description: 'Você será redirecionado para o WhatsApp.',
      });

      setFormData({ name: '', company: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="contact" className="bg-gradient-to-r from-[#2c2e85] via-[#009ee2] to-[#006996] py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Vamos começar a criar juntos
            </h2>
            <p className="text-lg text-white/90">
              Entre em contato e descubra como podemos ajudar seu negócio
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Qual é o seu nome? *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="company">Qual é o nome da sua empresa? *</Label>
                <Input
                  id="company"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">Qual é o seu email? *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone">Qual é o seu número de WhatsApp? *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2"
                  placeholder="(41) 99999-9999"
                />
              </div>

              <div>
                <Label htmlFor="message">Como podemos ajudar o seu negócio? *</Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 bg-white text-[#0088c7] hover:bg-slate-100 rounded-lg font-medium" 
                disabled={loading}
              >
                <Send className="h-4 w-4" />
                {loading ? 'Enviando...' : 'Vamos Conversar'}
              </Button>
            </form>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white/10 rounded-lg border border-white/20 p-8 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Informações de Contato
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Telefone</h4>
                      <a
                        href="tel:+5541984022907"
                        className="text-white/90 hover:text-white transition-colors"
                      >
                        +55 41 98402-2907
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">WhatsApp</h4>
                      <a
                        href="https://wa.me/5541984022907"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/90 hover:text-white transition-colors"
                      >
                        Clique para entrar em contato
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">E-mail</h4>
                      <a
                        href="mailto:helton.supervisor@klholding.com.br"
                        className="text-white/90 hover:text-white transition-colors"
                      >
                        helton.supervisor@klholding.com.br
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

