'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';

import { ImageUpload } from '@/app/(app)/operacional/controle-gasolina/_components/ImageUpload';
import { compressImage, compressImages } from '@/lib/image-compression';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '@/components/ui/signature-pad';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type ChecklistPerguntaTipo = 'TEXTO' | 'FOTO' | 'BOOLEANO' | 'NUMERICO' | 'SELECAO';

type Pergunta = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: ChecklistPerguntaTipo;
  obrigatoria: boolean;
  ordem: number;
  instrucoes: string | null;
  opcoes: string[];
  peso: number | null;
  permiteMultiplasFotos?: boolean;
  permiteAnexarFoto?: boolean;
};

type Grupo = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  perguntas: Pergunta[];
};

type ChecklistEscopoPayload = {
  id: string;
  unidade: { id: string; nome: string } | null;
  grupo: { id: string; nome: string } | null;
  template: {
    id: string;
    titulo: string;
    descricao: string | null;
    grupos: Grupo[];
  };
};

interface ChecklistResponderClientProps {
  escopo: ChecklistEscopoPayload;
  canManageTemplates: boolean;
}

export function ChecklistResponderClient({
  escopo,
  canManageTemplates,
}: ChecklistResponderClientProps) {
  const router = useRouter();
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [booleanAnswers, setBooleanAnswers] = useState<Record<string, 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICA' | null>>({});
  const [naoConformeDetails, setNaoConformeDetails] = useState<Record<string, { motivo: string; resolucao: string }>>({});
  const [numericAnswers, setNumericAnswers] = useState<Record<string, string>>({});
  const [selectAnswers, setSelectAnswers] = useState<Record<string, string>>({});
  const [photoAnswers, setPhotoAnswers] = useState<Record<string, File[]>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({}); // URLs de fotos salvas do rascunho
  const [notaAnswers, setNotaAnswers] = useState<Record<string, number | null>>({});
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAssinaturaDialog, setShowAssinaturaDialog] = useState(false);
  const [showAssinaturaGerenteDialog, setShowAssinaturaGerenteDialog] = useState(false);
  const [assinaturaFoto, setAssinaturaFoto] = useState<Blob | null>(null);
  const [assinaturaGerenteDataUrl, setAssinaturaGerenteDataUrl] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<GeolocationPosition | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [capturandoAssinatura, setCapturandoAssinatura] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Remover Leadster ao montar o componente
  useEffect(() => {
    removeLeadsterScript();
    // Remover periodicamente para garantir que não apareça
    const interval = setInterval(() => {
      removeLeadsterScript();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Carregar rascunho existente ao montar o componente
  useEffect(() => {
    const carregarRascunho = async () => {
      try {
        console.log('[ChecklistResponder] Carregando rascunho para escopo:', escopo.id);
        const response = await fetch(`/api/checklists-operacionais/respostas?escopoId=${escopo.id}`);
        const data = await response.json();
        
        console.log('[ChecklistResponder] Resposta da API:', response.status, data);
        
        if (response.ok && data.rascunho) {
          const r = data.rascunho;
          console.log('[ChecklistResponder] Rascunho encontrado:', r.id);
          console.log('[ChecklistResponder] Total de respostas no rascunho:', r.respostas?.length || 0);
          console.log('[ChecklistResponder] Respostas:', r.respostas);
          
          setRascunhoId(r.id);
          
          // Carregar observações
          if (r.observacoes) {
            console.log('[ChecklistResponder] Carregando observações:', r.observacoes);
            setObservacoes(r.observacoes);
          }
          
          // Função auxiliar para carregar fotos de uma URL
          // Armazena apenas as URLs, não converte para File (evita problemas de CORS e performance)
          const carregarFotosDeUrl = (fotoUrl: string | null, perguntaId: string, isAnexo: boolean = false) => {
            if (!fotoUrl) {
              console.log('[ChecklistResponder] Sem fotoUrl para pergunta:', perguntaId, 'isAnexo:', isAnexo);
              return;
            }
            
            try {
              // fotoUrl pode ser uma string única ou um JSON array de strings
              let fotosUrls: string[] = [];
              try {
                const parsed = JSON.parse(fotoUrl);
                if (Array.isArray(parsed)) {
                  fotosUrls = parsed;
                } else {
                  fotosUrls = [fotoUrl];
                }
              } catch {
                // Se não for JSON, é uma string única
                fotosUrls = [fotoUrl];
              }
              
              console.log('[ChecklistResponder] Carregando fotos de URL para pergunta:', perguntaId, 'isAnexo:', isAnexo, 'URLs:', fotosUrls);
              
              // Armazenar apenas as URLs para exibição
              // Não precisamos converter para File, podemos usar as URLs diretamente
              const key = isAnexo ? `${perguntaId}_anexo` : perguntaId;
              setPhotoUrls(prev => {
                const newUrls = {
                  ...prev,
                  [key]: fotosUrls,
                };
                console.log('[ChecklistResponder] PhotoUrls atualizado:', newUrls);
                return newUrls;
              });
            } catch (error) {
              console.error('[ChecklistResponder] Erro ao processar fotos do rascunho:', error);
            }
          };

          // Carregar respostas
          if (!r.respostas || r.respostas.length === 0) {
            console.log('[ChecklistResponder] Nenhuma resposta encontrada no rascunho');
          } else {
            console.log('[ChecklistResponder] Processando', r.respostas.length, 'respostas...');
          }
          
          r.respostas?.forEach((resposta: any) => {
            console.log('[ChecklistResponder] Processando resposta:', resposta);
            const pergunta = escopo.template.grupos
              .flatMap(g => g.perguntas)
              .find(p => p.id === resposta.perguntaId);
            
            if (!pergunta) {
              console.warn('[ChecklistResponder] Pergunta não encontrada para resposta:', resposta.perguntaId);
              return;
            }
            
            console.log('[ChecklistResponder] Pergunta encontrada:', pergunta.titulo, 'Tipo:', pergunta.tipo);
            
            switch (pergunta.tipo) {
              case 'TEXTO':
                if (resposta.valorTexto) {
                  console.log('[ChecklistResponder] Carregando resposta TEXTO:', resposta.valorTexto);
                  setTextAnswers(prev => ({ ...prev, [pergunta.id]: resposta.valorTexto }));
                }
                // Carregar fotos anexadas se houver
                if (resposta.fotoUrl) {
                  carregarFotosDeUrl(resposta.fotoUrl, pergunta.id, true);
                }
                break;
              case 'BOOLEANO':
                if (resposta.valorBoolean !== null && resposta.valorBoolean !== undefined) {
                  const valor = resposta.valorBoolean ? 'CONFORME' : 'NAO_CONFORME';
                  console.log('[ChecklistResponder] Carregando resposta BOOLEANO:', valor);
                  setBooleanAnswers(prev => ({ ...prev, [pergunta.id]: valor }));
                }
                if (resposta.observacao) {
                  try {
                    const partes = resposta.observacao.split('\n\n');
                    if (partes.length >= 2) {
                      const motivo = partes[0].replace('Motivo: ', '');
                      const resolucao = partes[1].replace('O que foi feito para resolver: ', '');
                      setNaoConformeDetails(prev => ({
                        ...prev,
                        [pergunta.id]: { motivo, resolucao },
                      }));
                    }
                  } catch (e) {
                    console.error('Erro ao parsear observação:', e);
                  }
                }
                // Carregar fotos anexadas se houver
                if (resposta.fotoUrl) {
                  carregarFotosDeUrl(resposta.fotoUrl, pergunta.id, true);
                }
                break;
              case 'NUMERICO':
                if (resposta.valorNumero !== null && resposta.valorNumero !== undefined) {
                  console.log('[ChecklistResponder] Carregando resposta NUMERICO:', resposta.valorNumero);
                  setNumericAnswers(prev => ({ ...prev, [pergunta.id]: String(resposta.valorNumero) }));
                }
                // Carregar fotos anexadas se houver
                if (resposta.fotoUrl) {
                  carregarFotosDeUrl(resposta.fotoUrl, pergunta.id, true);
                }
                break;
              case 'SELECAO':
                if (resposta.valorOpcao) {
                  console.log('[ChecklistResponder] Carregando resposta SELECAO:', resposta.valorOpcao);
                  setSelectAnswers(prev => ({ ...prev, [pergunta.id]: resposta.valorOpcao }));
                }
                // Carregar fotos anexadas se houver
                if (resposta.fotoUrl) {
                  carregarFotosDeUrl(resposta.fotoUrl, pergunta.id, true);
                }
                break;
              case 'FOTO':
                // Carregar URLs das fotos principais
                if (resposta.fotoUrl) {
                  carregarFotosDeUrl(resposta.fotoUrl, pergunta.id, false);
                }
                break;
            }
            
            // Carregar nota se existir (para TODAS as perguntas, não apenas as que têm peso)
            if (resposta.nota !== null && resposta.nota !== undefined) {
              console.log('[ChecklistResponder] Carregando nota:', resposta.nota, 'para pergunta:', pergunta.id);
              setNotaAnswers(prev => ({ ...prev, [pergunta.id]: resposta.nota }));
            }
          });
          
          toast.info('Rascunho encontrado e carregado. Você pode continuar de onde parou.', { duration: 4000 });
        }
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        // Não mostrar erro, apenas não carregar rascunho
      }
    };

    carregarRascunho();
  }, [escopo.id, escopo.template.grupos]);

  const perguntasObrigatorias = useMemo(() => {
    const set = new Set<string>();
    escopo.template.grupos.forEach(grupo =>
      grupo.perguntas.forEach(pergunta => {
        if (pergunta.obrigatoria) set.add(pergunta.id);
      })
    );
    return set;
  }, [escopo]);

  function handleFotoChange(perguntaId: string, file: File | null, permiteMultiplas: boolean = false) {
    if (!file) return;
    
    if (permiteMultiplas) {
      setPhotoAnswers(prev => ({
        ...prev,
        [perguntaId]: [...(prev[perguntaId] || []), file],
      }));
    } else {
      setPhotoAnswers(prev => ({ ...prev, [perguntaId]: [file] }));
    }
  }

  const handleRemoveFoto = (perguntaId: string, index: number) => {
    setPhotoAnswers(prev => {
      const fotos = prev[perguntaId] || [];
      return {
        ...prev,
        [perguntaId]: fotos.filter((_, i) => i !== index),
      };
    });
  };

  // Inicializar câmera quando abrir dialog de assinatura
  useEffect(() => {
    if (!showAssinaturaDialog) {
      // Limpar stream quando dialog fechar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setStream(null);
      }
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        // Limpar stream anterior se existir
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        
        if (!isMounted) {
          s.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        if (isMounted) {
          toast.error('Não foi possível acessar a câmera. Verifique as permissões.');
        }
      }
    })();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [showAssinaturaDialog]);

  const captureSelfie = async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    const w = 640;
    const h = Math.round((v.videoHeight / v.videoWidth) * 640) || 480;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.8));
  };

  async function handleCapturarAssinatura() {
    setCapturandoAssinatura(true);
    try {
      // Capturar localização
      const pos = await new Promise<GeolocationPosition | null>(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          p => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      if (!pos) {
        toast.warning('Localização não capturada. Continuando sem localização...');
      } else {
        // Buscar endereço via reverse geocoding
        setBuscandoEndereco(true);
        try {
          const response = await fetch(
            `/api/geocoding/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            setEndereco(data.endereco || null);
          }
        } catch (error) {
          console.error('Erro ao buscar endereço:', error);
          // Não bloquear o envio se falhar o geocoding
        } finally {
          setBuscandoEndereco(false);
        }
      }

      // Capturar foto
      const foto = await captureSelfie();
      if (!foto) {
        toast.error('Não foi possível capturar a foto. Tente novamente.');
        setCapturandoAssinatura(false);
        return;
      }

      setAssinaturaFoto(foto);
      setLocalizacao(pos);
      setShowAssinaturaDialog(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      
      // Mostrar dialog de assinatura do gerente
      setShowAssinaturaGerenteDialog(true);
    } catch (error) {
      console.error('Erro ao capturar assinatura:', error);
      toast.error('Erro ao capturar assinatura. Tente novamente.');
      setCapturandoAssinatura(false);
    }
  }

  const salvarRascunho = useCallback(async (showToast = false) => {
    if (salvandoRascunho) {
      console.log('[ChecklistResponder] Já está salvando, ignorando...');
      return;
    }
    if (!escopo?.id) {
      console.log('[ChecklistResponder] Não pode salvar rascunho: escopo não carregado');
      return; // Não salvar se o escopo ainda não carregou
    }

    console.log('[ChecklistResponder] Iniciando salvamento de rascunho, rascunhoId atual:', rascunhoId);
    setSalvandoRascunho(true);

    try {
      // Coletar todas as fotos que serão enviadas (incluindo anexos de todas as perguntas)
      const todasFotos: File[] = [];
      
      for (const grupo of escopo.template.grupos) {
        for (const pergunta of grupo.perguntas) {
          // Fotos principais (para perguntas do tipo FOTO)
          if (pergunta.tipo === 'FOTO') {
            const fotos = photoAnswers[pergunta.id] || [];
            todasFotos.push(...fotos);
          }
          // Fotos anexadas (disponível para TODAS as perguntas)
          const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`] || [];
          todasFotos.push(...fotosAnexadas);
        }
      }
      
      console.log('[ChecklistResponder] Total de fotos para comprimir:', todasFotos.length);
      
      // Comprimir todas as fotos em paralelo (mesma compressão do envio final)
      const fotosComprimidasMap = new Map<File, File>();
      if (todasFotos.length > 0) {
        try {
          console.log('[ChecklistResponder] Comprimindo fotos...');
          const fotosComprimidas = await compressImages(todasFotos, {
            maxWidth: 1280,
            maxHeight: 1280,
            quality: 0.7,
            maxSizeMB: 0.5,
          });
          todasFotos.forEach((original, index) => {
            fotosComprimidasMap.set(original, fotosComprimidas[index]);
          });
          console.log('[ChecklistResponder] Fotos comprimidas com sucesso');
        } catch (error) {
          console.error('[ChecklistResponder] Erro ao comprimir fotos, continuando sem compressão:', error);
          // Continuar mesmo se a compressão falhar
        }
      }

      // Preparar FormData similar ao enviarChecklist mas sem assinatura e sem validação obrigatória
      const formData = new FormData();
      formData.append('escopoId', escopo.id);
      formData.append('isDraft', 'true');
      if (rascunhoId) {
        formData.append('respostaId', rascunhoId);
      }
      if (observacoes.trim()) {
        formData.append('observacoes', observacoes.trim());
      }

      // Não incluir assinaturas em rascunho
      // Não incluir localização obrigatória em rascunho

      const answersPayload: Array<{
        perguntaId: string;
        tipo: ChecklistPerguntaTipo;
        valorTexto?: string;
        valorBoolean?: boolean;
        valorNumero?: number;
        valorOpcao?: string;
        nota?: number;
      }> = [];

      for (const grupo of escopo.template.grupos) {
        for (const pergunta of grupo.perguntas) {
          switch (pergunta.tipo) {
            case 'TEXTO': {
              const valor = textAnswers[pergunta.id]?.trim();
              const nota = notaAnswers[pergunta.id];
              
              // Salvar se tiver texto OU se tiver nota (mesmo sem texto)
              if (valor || (nota !== null && nota !== undefined)) {
                answersPayload.push({
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorTexto: valor || undefined,
                  nota: nota || undefined,
                });
              }
              break;
            }
            case 'BOOLEANO': {
              const valor = booleanAnswers[pergunta.id];
              const nota = notaAnswers[pergunta.id];
              
              // Salvar se tiver resposta booleana OU se tiver nota (mesmo sem resposta)
              if (valor !== null && valor !== undefined || (nota !== null && nota !== undefined)) {
                answersPayload.push({
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorBoolean: valor !== null && valor !== undefined ? valor === 'CONFORME' : undefined,
                  nota: nota || undefined,
                });
                
                // Adicionar detalhes de "Não Conforme" se existirem
                if (valor === 'NAO_CONFORME' && naoConformeDetails[pergunta.id]) {
                  const details = naoConformeDetails[pergunta.id];
                  formData.append(`observacao_${pergunta.id}`, JSON.stringify({
                    motivo: details.motivo.trim(),
                    resolucao: details.resolucao.trim(),
                  }));
                }
              }
              break;
            }
            case 'NUMERICO': {
              const valor = numericAnswers[pergunta.id];
              const nota = notaAnswers[pergunta.id];
              
              // Salvar se tiver valor numérico OU se tiver nota (mesmo sem valor)
              if (valor) {
                const numVal = Number(valor);
                if (!isNaN(numVal)) {
                  answersPayload.push({
                    perguntaId: pergunta.id,
                    tipo: pergunta.tipo,
                    valorNumero: numVal,
                    nota: nota || undefined,
                  });
                }
              } else if (nota !== null && nota !== undefined) {
                // Salvar apenas a nota se não tiver valor numérico
                answersPayload.push({
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  nota: nota,
                });
              }
              break;
            }
            case 'SELECAO': {
              const valor = selectAnswers[pergunta.id];
              const nota = notaAnswers[pergunta.id];
              
              // Salvar se tiver opção selecionada OU se tiver nota (mesmo sem seleção)
              if (valor || (nota !== null && nota !== undefined)) {
                answersPayload.push({
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorOpcao: valor || undefined,
                  nota: nota || undefined,
                });
              }
              break;
            }
            case 'FOTO': {
              const fotos = photoAnswers[pergunta.id] || [];
              const fotosUrlsSalvas = photoUrls[pergunta.id] || [];
              
              // Se tem fotos novas, enviar
              if (fotos.length > 0) {
                // Usar fotos comprimidas se disponíveis
                const fotosParaEnviar = fotos.map(f => fotosComprimidasMap.get(f) || f);
                
                // Se permite múltiplas fotos, enviar todas
                if (pergunta.permiteMultiplasFotos) {
                  fotosParaEnviar.forEach((foto, index) => {
                    formData.append(`foto_${pergunta.id}_${index}`, foto);
                  });
                } else {
                  // Se não permite múltiplas, enviar apenas a primeira
                  formData.append(`foto_${pergunta.id}`, fotosParaEnviar[0]);
                }
              }
              
              // Sempre adicionar resposta se tiver fotos novas OU fotos salvas OU nota
              // Isso garante que notas e fotos salvas sejam preservadas
              if (fotos.length > 0 || fotosUrlsSalvas.length > 0 || notaAnswers[pergunta.id] !== null && notaAnswers[pergunta.id] !== undefined) {
                answersPayload.push({
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  nota: notaAnswers[pergunta.id] || undefined,
                });
              }
              break;
            }
          }

          // Adicionar fotos anexadas de TODAS as perguntas (campo universal disponível para todos os tipos)
          const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`] || [];
          const fotosAnexadasUrls = photoUrls[`${pergunta.id}_anexo`] || [];
          
          // Se tem fotos anexadas novas, enviar
          if (fotosAnexadas.length > 0) {
            const fotosParaEnviar = fotosAnexadas.map(f => fotosComprimidasMap.get(f) || f);
            fotosParaEnviar.forEach((foto, index) => {
              formData.append(`foto_anexada_${pergunta.id}_${index}`, foto);
            });
          }
          
          // Se tem fotos anexadas salvas mas não novas, garantir que a resposta seja salva para preservar as fotos
          // Isso é importante para perguntas que não têm outro tipo de resposta além da foto anexada
          if (fotosAnexadasUrls.length > 0 && fotosAnexadas.length === 0) {
            // Verificar se já existe uma resposta para esta pergunta
            const jaTemResposta = answersPayload.some(r => r.perguntaId === pergunta.id);
            if (!jaTemResposta) {
              // Criar uma resposta apenas para preservar as fotos anexadas
              answersPayload.push({
                perguntaId: pergunta.id,
                tipo: pergunta.tipo,
                nota: notaAnswers[pergunta.id] || undefined,
              });
            }
          }
        }
      }

      formData.append('answers', JSON.stringify(answersPayload));

      console.log('[ChecklistResponder] Enviando rascunho para API, total de respostas:', answersPayload.length);
      console.log('[ChecklistResponder] Respostas:', answersPayload);

      const response = await fetch('/api/checklists-operacionais/respostas', {
        method: 'POST',
        body: formData,
      });

      console.log('[ChecklistResponder] Resposta da API:', response.status, response.statusText);

      const result = await response.json();

      if (!response.ok) {
        console.error('[ChecklistResponder] Erro na API:', result);
        throw new Error(result.message || result.error || 'Erro ao salvar rascunho');
      }

      console.log('[ChecklistResponder] Rascunho salvo com sucesso:', result.resposta?.id);

      if (result.resposta?.id) {
        setRascunhoId(result.resposta.id);
        console.log('[ChecklistResponder] RascunhoId atualizado para:', result.resposta.id);
      }

      if (showToast) {
        toast.success('Rascunho salvo automaticamente', { duration: 2000 });
      }
    } catch (error) {
      console.error('[ChecklistResponder] Erro ao salvar rascunho:', error);
      console.error('[ChecklistResponder] Stack:', error instanceof Error ? error.stack : 'N/A');
      if (showToast) {
        toast.error('Erro ao salvar rascunho. Tente novamente.');
      }
    } finally {
      setSalvandoRascunho(false);
      console.log('[ChecklistResponder] Salvamento finalizado');
    }
  }, [escopo?.id, rascunhoId, observacoes, textAnswers, booleanAnswers, numericAnswers, selectAnswers, notaAnswers, naoConformeDetails, photoAnswers, photoUrls, escopo?.template?.grupos]);

  // Criar rascunho inicial quando o componente montar (se não existir)
  useEffect(() => {
    if (!rascunhoId && escopo?.id) {
      // Aguardar 2 segundos para garantir que o carregarRascunho terminou
      const timer = setTimeout(() => {
        // Verificar novamente se ainda não tem rascunho antes de criar
        if (!rascunhoId) {
          console.log('[ChecklistResponder] Criando rascunho inicial para escopo:', escopo.id);
          salvarRascunho(false); // Criar rascunho inicial sem toast
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [escopo?.id, rascunhoId, salvarRascunho]); // Dependências: escopo, rascunhoId e salvarRascunho

  // Auto-save: salvar automaticamente após 3 segundos de inatividade
  useEffect(() => {
    // Limpar timeout anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Se não tiver rascunho ainda, criar um inicial (mesmo sem respostas)
    if (!rascunhoId) {
      console.log('[ChecklistResponder] Auto-save: Criando rascunho inicial...');
      autoSaveTimeoutRef.current = setTimeout(() => {
        salvarRascunho(false); // false = não mostrar toast
      }, 2000);
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }

    // Verificar se há respostas para salvar (incluindo notas e fotos salvas)
    const temRespostas = 
      Object.keys(textAnswers).length > 0 ||
      Object.keys(booleanAnswers).length > 0 ||
      Object.keys(numericAnswers).length > 0 ||
      Object.keys(selectAnswers).length > 0 ||
      Object.keys(naoConformeDetails).length > 0 ||
      Object.keys(photoAnswers).length > 0 ||
      Object.keys(photoUrls).length > 0 ||
      Object.keys(notaAnswers).length > 0 ||
      observacoes.trim().length > 0;

    if (!temRespostas) {
      console.log('[ChecklistResponder] Auto-save: Sem respostas para salvar, aguardando...');
      return;
    }

    console.log('[ChecklistResponder] Auto-save: Agendando salvamento em 3 segundos...');

    // Agendar salvamento após 3 segundos
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('[ChecklistResponder] Auto-save: Executando salvamento...');
      salvarRascunho(false); // false = não mostrar toast
    }, 3000);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [textAnswers, booleanAnswers, numericAnswers, selectAnswers, naoConformeDetails, photoAnswers, photoUrls, notaAnswers, observacoes, salvarRascunho, rascunhoId]);

  async function enviarChecklist(fotoAssinatura: Blob | null, pos: GeolocationPosition | null, assinaturaGerenteDataUrl?: string | null) {
    if (submitting) return;

    setSubmitting(true);

    try {
      // Comprimir todas as imagens antes de enviar para evitar erro 413
      toast.info('Comprimindo imagens...', { duration: 2000 });
      
      const todasFotos: File[] = [];
      
      // Coletar todas as fotos que serão enviadas (incluindo anexos de todas as perguntas)
      for (const grupo of escopo.template.grupos) {
        for (const pergunta of grupo.perguntas) {
          // Fotos principais (para perguntas do tipo FOTO)
          if (pergunta.tipo === 'FOTO') {
            const fotos = photoAnswers[pergunta.id] || [];
            todasFotos.push(...fotos);
          }
          // Fotos anexadas (disponível para TODAS as perguntas)
          const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`] || [];
          todasFotos.push(...fotosAnexadas);
        }
      }
      
      // Comprimir todas as fotos em paralelo com compressão mais agressiva
      const fotosComprimidasMap = new Map<File, File>();
      if (todasFotos.length > 0) {
        const fotosComprimidas = await compressImages(todasFotos, {
          maxWidth: 1280, // Reduzido de 1920 para 1280
          maxHeight: 1280, // Reduzido de 1920 para 1280
          quality: 0.7, // Reduzido de 0.8 para 0.7
          maxSizeMB: 0.5, // Reduzido de 1MB para 0.5MB
        });
        todasFotos.forEach((original, index) => {
          fotosComprimidasMap.set(original, fotosComprimidas[index]);
        });
      }
      
      // Comprimir assinatura do supervisor se existir
      let assinaturaComprimida: Blob | null = null;
      if (fotoAssinatura) {
        try {
          const assinaturaFile = new File([fotoAssinatura], 'assinatura.jpg', { type: 'image/jpeg' });
          const comprimida = await compressImage(assinaturaFile, {
            maxWidth: 1280, // Reduzido de 1920 para 1280
            maxHeight: 1280, // Reduzido de 1920 para 1280
            quality: 0.7, // Reduzido de 0.8 para 0.7
            maxSizeMB: 0.3, // Reduzido de 0.5MB para 0.3MB
          });
          assinaturaComprimida = comprimida;
        } catch (error) {
          console.error('Erro ao comprimir assinatura:', error);
          assinaturaComprimida = fotoAssinatura; // Usar original se falhar
        }
      }

      const formData = new FormData();
      formData.append('escopoId', escopo.id);
      if (observacoes.trim()) {
        formData.append('observacoes', observacoes.trim());
      }

      // Adicionar foto de assinatura do supervisor (comprimida)
      if (assinaturaComprimida) {
        formData.append('assinaturaFoto', assinaturaComprimida, 'assinatura.jpg');
      }

      // Adicionar assinatura do gerente (data URL)
      if (assinaturaGerenteDataUrl) {
        formData.append('assinaturaGerenteDataUrl', assinaturaGerenteDataUrl);
      }

      // Adicionar localização
      if (pos) {
        formData.append('lat', String(pos.coords.latitude));
        formData.append('lng', String(pos.coords.longitude));
        formData.append('accuracy', String(Math.round(pos.coords.accuracy || 0)));
      }

      // Adicionar endereço se disponível
      if (endereco) {
        formData.append('endereco', endereco);
      }

      // Adicionar deviceId
      const deviceId = localStorage.getItem('deviceId') || '';
      if (deviceId) {
        formData.append('deviceId', deviceId);
      }

      const answersPayload: Array<{
        perguntaId: string;
        tipo: ChecklistPerguntaTipo;
        valorTexto?: string;
        valorBoolean?: boolean;
        valorNumero?: number;
        valorOpcao?: string;
        nota?: number;
      }> = [];

      for (const grupo of escopo.template.grupos) {
        for (const pergunta of grupo.perguntas) {
          let answerAdded = false;
          let answerData: {
            perguntaId: string;
            tipo: ChecklistPerguntaTipo;
            valorTexto?: string;
            valorBoolean?: boolean;
            valorNumero?: number;
            valorOpcao?: string;
            nota?: number;
          } | null = null;

          switch (pergunta.tipo) {
            case 'TEXTO': {
              const valor = textAnswers[pergunta.id]?.trim();
              if (valor) {
                answerData = {
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorTexto: valor,
                };
                answerAdded = true;
              }
              break;
            }
            case 'FOTO': {
              const fotos = photoAnswers[pergunta.id] || [];
              if (fotos.length > 0) {
                // Usar fotos comprimidas se disponíveis
                const fotosParaEnviar = fotos.map(f => fotosComprimidasMap.get(f) || f);
                
                // Se permite múltiplas fotos, enviar todas
                if (pergunta.permiteMultiplasFotos) {
                  fotosParaEnviar.forEach((foto, index) => {
                    formData.append(`foto_${pergunta.id}_${index}`, foto);
                  });
                } else {
                  // Se não permite múltiplas, enviar apenas a primeira
                  formData.append(`foto_${pergunta.id}`, fotosParaEnviar[0]);
                }
                answerData = {
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                };
                answerAdded = true;
              } else if (pergunta.obrigatoria) {
                throw new Error(`Envie a foto para "${pergunta.titulo}".`);
              }
              break;
            }
            case 'BOOLEANO': {
              const resposta = booleanAnswers[pergunta.id];
              
              if (!resposta && pergunta.obrigatoria) {
                throw new Error(
                  `Informe uma resposta (Conforme, Não Conforme ou Não se aplica) para "${pergunta.titulo}".`
                );
              }

              if (resposta) {
                // Se for "Não Conforme", validar que os detalhes foram preenchidos
                if (resposta === 'NAO_CONFORME') {
                  const details = naoConformeDetails[pergunta.id];
                  if (!details?.motivo?.trim() || !details?.resolucao?.trim()) {
                    throw new Error(
                      `Para "${pergunta.titulo}", quando selecionar "Não Conforme", é obrigatório preencher o motivo e o que foi feito para resolver.`
                    );
                  }
                }

                // Converter para boolean: CONFORME = true, NAO_CONFORME = false, NAO_APLICA = null (não enviado)
                const valorBoolean = resposta === 'CONFORME' ? true : resposta === 'NAO_CONFORME' ? false : null;
                
                if (valorBoolean !== null) {
                  answerData = {
                    perguntaId: pergunta.id,
                    tipo: pergunta.tipo,
                    valorBoolean,
                  };
                  answerAdded = true;

                  // Se for "Não Conforme", adicionar detalhes na observação
                  if (resposta === 'NAO_CONFORME' && naoConformeDetails[pergunta.id]) {
                    const details = naoConformeDetails[pergunta.id];
                    formData.append(`observacao_${pergunta.id}`, JSON.stringify({
                      motivo: details.motivo.trim(),
                      resolucao: details.resolucao.trim(),
                    }));
                  }
                }
              }
              break;
            }
            case 'NUMERICO': {
              const valorStr = numericAnswers[pergunta.id];
              if (valorStr) {
                const numero = Number(valorStr);
                if (Number.isNaN(numero)) {
                  throw new Error(`Informe um valor numérico válido para "${pergunta.titulo}".`);
                }
                answerData = {
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorNumero: numero,
                };
                answerAdded = true;
              } else if (pergunta.obrigatoria) {
                throw new Error(`Informe um valor para "${pergunta.titulo}".`);
              }
              break;
            }
            case 'SELECAO': {
              const valor = selectAnswers[pergunta.id];
              if (valor) {
                answerData = {
                  perguntaId: pergunta.id,
                  tipo: pergunta.tipo,
                  valorOpcao: valor,
                };
                answerAdded = true;
              } else if (pergunta.obrigatoria) {
                throw new Error(`Selecione uma opção para "${pergunta.titulo}".`);
              }
              break;
            }
            default:
              break;
          }

          // Adicionar nota se a pergunta tiver peso e uma resposta foi adicionada
          if (answerAdded && answerData && pergunta.peso !== null && pergunta.peso !== undefined) {
            const nota = notaAnswers[pergunta.id];
            if (nota !== null && nota !== undefined) {
              answerData.nota = nota;
            }
          }

          // Adicionar fotos anexadas de TODAS as perguntas (campo universal disponível para todos os tipos)
          const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`] || [];
          if (fotosAnexadas.length > 0) {
            const fotosParaEnviar = fotosAnexadas.map(f => fotosComprimidasMap.get(f) || f);
            fotosParaEnviar.forEach((foto, index) => {
              formData.append(`foto_anexada_${pergunta.id}_${index}`, foto);
            });
          }

          if (answerData) {
            answersPayload.push(answerData);
          }
        }
      }

      formData.append('answers', JSON.stringify(answersPayload));

      const response = await fetch('/api/checklists-operacionais/respostas', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMessage = data?.message || data?.error || `Erro ${response.status}: ${response.statusText}`;
        console.error('Erro ao enviar checklist:', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.success('Checklist enviado com sucesso!');
      
      if (data.protocolo) {
        toast.info(`Protocolo: ${data.protocolo}`, { duration: 5000 });
      }
      
      router.push('/operacional/checklists');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível enviar o checklist.';
      toast.error(message);
      setSubmitting(false);
      // Resetar estado do dialog de assinatura se houver erro
      setShowAssinaturaDialog(false);
      setCapturandoAssinatura(false);
      setAssinaturaFoto(null);
      setLocalizacao(null);
      setEndereco(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Abrir dialog de assinatura antes de enviar
    setShowAssinaturaDialog(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-6 w-full max-w-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              {escopo.template.titulo}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unidade: {escopo.unidade?.nome ?? 'Não informada'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canManageTemplates && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs md:text-sm"
                onClick={() => router.push('/operacional/checklists/admin')}
              >
                Gerenciar modelos
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
              Voltar
            </Button>
          </div>
        </div>
        {escopo.template.descricao && (
          <p className="text-sm text-muted-foreground">{escopo.template.descricao}</p>
        )}
      </div>

      <Separator />

      <div className="space-y-4 md:space-y-6 w-full">
        {escopo.template.grupos.map(grupo => (
          <Card key={grupo.id} className="border-border/80 w-full">
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base md:text-lg font-semibold text-foreground">
                  {grupo.titulo}
                </CardTitle>
                <Badge variant="outline" className="w-fit">Seção</Badge>
              </div>
              {grupo.descricao && (
                <p className="text-sm text-muted-foreground mt-2">{grupo.descricao}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 w-full">
              {grupo.perguntas.map(pergunta => (
                <div key={pergunta.id} className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <Label className="text-base md:text-sm font-medium text-foreground">
                        {pergunta.titulo}
                      </Label>
                      {pergunta.descricao && (
                        <p className="text-sm md:text-xs text-muted-foreground mt-1">
                          {pergunta.descricao}
                        </p>
                      )}
                    </div>
                    {pergunta.obrigatoria ? (
                      <Badge variant="secondary" className="w-fit">Obrigatória</Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">Opcional</Badge>
                    )}
                  </div>

                  {pergunta.instrucoes && (
                    <p className="text-xs text-muted-foreground">{pergunta.instrucoes}</p>
                  )}

                  {pergunta.tipo === 'TEXTO' && (
                    <Textarea
                      placeholder="Digite a resposta..."
                      value={textAnswers[pergunta.id] ?? ''}
                      onChange={event =>
                        setTextAnswers(prev => ({
                          ...prev,
                          [pergunta.id]: event.target.value,
                        }))
                      }
                      className="min-h-[120px] text-base md:text-sm"
                    />
                  )}

                  {pergunta.tipo === 'FOTO' && (
                    <div className="space-y-3">
                      {pergunta.permiteMultiplasFotos ? (
                        <>
                          <div className="space-y-2">
                            {/* Mostrar fotos salvas do rascunho (URLs) */}
                            {(photoUrls[pergunta.id] || []).map((url, index) => (
                              <div key={`url-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                <img
                                  src={url}
                                  alt={`Foto salva ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded"
                                  onError={(e) => {
                                    console.error('[ChecklistResponder] Erro ao carregar foto:', url);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Foto salva {index + 1}</p>
                                  <p className="text-xs text-muted-foreground">Do rascunho</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPhotoUrls(prev => {
                                      const urls = prev[pergunta.id] || [];
                                      return {
                                        ...prev,
                                        [pergunta.id]: urls.filter((_, i) => i !== index),
                                      };
                                    });
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Remover
                                </Button>
                              </div>
                            ))}
                            {/* Mostrar fotos novas (File objects) */}
                            {(photoAnswers[pergunta.id] || []).map((foto, index) => (
                              <div key={`file-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                <img
                                  src={URL.createObjectURL(foto)}
                                  alt={`Foto ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Foto {index + 1}</p>
                                  <p className="text-xs text-muted-foreground">{foto.name}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFoto(pergunta.id, index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                          <ImageUpload
                            onChange={file => handleFotoChange(pergunta.id, file, true)}
                            label="Adicionar outra foto"
                            description="Toque para capturar mais uma imagem"
                          />
                        </>
                      ) : (
                        <>
                          {/* Mostrar foto salva do rascunho se houver */}
                          {photoUrls[pergunta.id] && photoUrls[pergunta.id].length > 0 && (
                            <div className="space-y-2 mb-3">
                              {photoUrls[pergunta.id].map((url, index) => (
                                <div key={`url-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                  <img
                                    src={url}
                                    alt={`Foto salva ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      console.error('[ChecklistResponder] Erro ao carregar foto:', url);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Foto salva</p>
                                    <p className="text-xs text-muted-foreground">Do rascunho</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPhotoUrls(prev => {
                                        const urls = prev[pergunta.id] || [];
                                        return {
                                          ...prev,
                                          [pergunta.id]: urls.filter((_, i) => i !== index),
                                        };
                                      });
                                    }}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    Remover
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Mostrar foto nova se houver */}
                          {photoAnswers[pergunta.id] && photoAnswers[pergunta.id].length > 0 && (
                            <div className="space-y-2 mb-3">
                              {photoAnswers[pergunta.id].map((foto, index) => (
                                <div key={`file-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                  <img
                                    src={URL.createObjectURL(foto)}
                                    alt={`Foto ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Foto {index + 1}</p>
                                    <p className="text-xs text-muted-foreground">{foto.name}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFoto(pergunta.id, index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    Remover
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <ImageUpload
                            onChange={file => handleFotoChange(pergunta.id, file, false)}
                            label="Adicionar foto"
                            description="Toque para capturar a imagem da evidência"
                          />
                        </>
                      )}
                    </div>
                  )}

                  {pergunta.tipo === 'BOOLEANO' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Select
                          value={booleanAnswers[pergunta.id] ?? ''}
                          onValueChange={value => {
                            // Permitir alternar entre todas as opções, incluindo voltar para CONFORME
                            const newValue = value === 'CONFORME' || value === 'NAO_CONFORME' || value === 'NAO_APLICA' 
                              ? value as 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICA'
                              : null;
                            
                            setBooleanAnswers(prev => ({
                              ...prev,
                              [pergunta.id]: newValue,
                            }));
                            
                            // Limpar detalhes se mudar de "Não Conforme" para qualquer outra opção
                            if (newValue !== 'NAO_CONFORME') {
                              setNaoConformeDetails(prev => {
                                const next = { ...prev };
                                delete next[pergunta.id];
                                return next;
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-12 md:h-10 text-base md:text-sm">
                            <SelectValue placeholder="Selecione uma opção" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONFORME">Conforme</SelectItem>
                            <SelectItem value="NAO_CONFORME">Não Conforme</SelectItem>
                            <SelectItem value="NAO_APLICA">Não se aplica</SelectItem>
                          </SelectContent>
                        </Select>
                        {booleanAnswers[pergunta.id] && (
                          <p className="text-xs text-muted-foreground">
                            Você pode alterar a seleção clicando novamente no campo acima
                          </p>
                        )}
                      </div>

                      {booleanAnswers[pergunta.id] === 'NAO_CONFORME' && (
                        <div className="space-y-3 rounded-md border border-border/70 bg-muted/30 p-4">
                          <div className="space-y-2">
                            <Label htmlFor={`motivo-${pergunta.id}`} className="text-sm font-medium">
                              Motivo da não conformidade <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id={`motivo-${pergunta.id}`}
                              placeholder="Descreva o motivo da não conformidade..."
                              value={naoConformeDetails[pergunta.id]?.motivo ?? ''}
                              onChange={event =>
                                setNaoConformeDetails(prev => ({
                                  ...prev,
                                  [pergunta.id]: {
                                    motivo: event.target.value,
                                    resolucao: prev[pergunta.id]?.resolucao ?? '',
                                  },
                                }))
                              }
                              className="min-h-[100px] text-base md:text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`resolucao-${pergunta.id}`} className="text-base md:text-sm font-medium">
                              O que foi feito para resolver <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id={`resolucao-${pergunta.id}`}
                              placeholder="Descreva as ações tomadas para resolver a não conformidade..."
                              value={naoConformeDetails[pergunta.id]?.resolucao ?? ''}
                              onChange={event =>
                                setNaoConformeDetails(prev => ({
                                  ...prev,
                                  [pergunta.id]: {
                                    motivo: prev[pergunta.id]?.motivo ?? '',
                                    resolucao: event.target.value,
                                  },
                                }))
                              }
                              className="min-h-[100px] text-base md:text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {pergunta.tipo === 'NUMERICO' && (
                    <Input
                      type="number"
                      step="any"
                      value={numericAnswers[pergunta.id] ?? ''}
                      onChange={event =>
                        setNumericAnswers(prev => ({
                          ...prev,
                          [pergunta.id]: event.target.value,
                        }))
                      }
                      placeholder="Informe o valor"
                      className="text-base md:text-sm h-12 md:h-10"
                      inputMode="decimal"
                    />
                  )}

                  {pergunta.tipo === 'SELECAO' && (
                    <Select
                      value={selectAnswers[pergunta.id] ?? ''}
                      onValueChange={value =>
                        setSelectAnswers(prev => ({
                          ...prev,
                          [pergunta.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-12 md:h-10 text-base md:text-sm">
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        {pergunta.opcoes.map(opcao => (
                          <SelectItem key={opcao} value={opcao}>
                            {opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Sistema de Pontuação - Mostrar apenas se a pergunta tiver peso definido */}
                  {pergunta.peso !== null && pergunta.peso !== undefined && (
                    <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-4">
                      <Label className="text-xs md:text-xs font-medium">
                        Avaliação (Peso {pergunta.peso})
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Selecione a nota que melhor representa a situação
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map(nota => {
                          const cores = {
                            1: 'bg-red-500',
                            2: 'bg-orange-500',
                            3: 'bg-yellow-500',
                            4: 'bg-green-500',
                            5: 'bg-green-400',
                          };
                          const labels = {
                            1: 'Péssimo',
                            2: 'Ruim',
                            3: 'Regular',
                            4: 'Bom',
                            5: 'Ótimo',
                          };
                          const isSelected = notaAnswers[pergunta.id] === nota;
                          return (
                            <button
                              key={nota}
                              type="button"
                              onClick={() =>
                                setNotaAnswers(prev => ({
                                  ...prev,
                                  [pergunta.id]: isSelected ? null : nota,
                                }))
                              }
                              className={`flex items-center justify-center gap-2 px-4 py-3 md:px-3 md:py-2 rounded-md border transition-all min-h-[48px] md:min-h-0 ${
                                isSelected
                                  ? 'border-primary bg-primary/10 shadow-sm scale-105'
                                  : 'border-border hover:bg-muted active:scale-95'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 md:w-5 md:h-5 rounded-full ${cores[nota as keyof typeof cores]}`}
                              />
                              <span className="text-sm md:text-xs font-medium">
                                {nota} - {labels[nota as keyof typeof labels]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {notaAnswers[pergunta.id] && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Nota selecionada: {notaAnswers[pergunta.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Campo de upload de foto para TODAS as perguntas - Disponível sempre */}
                  <div className="space-y-3 rounded-md border border-border/70 bg-muted/30 p-4">
                    <Label className="text-sm font-medium">Anexar foto (opcional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Você pode anexar uma foto como evidência adicional para esta pergunta
                    </p>
                    <div className="space-y-2">
                      {/* Mostrar fotos anexadas salvas do rascunho (URLs) */}
                      {(photoUrls[`${pergunta.id}_anexo`] || []).map((url, index) => (
                        <div key={`url-anexo-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                          <img
                            src={url}
                            alt={`Foto anexada salva ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              console.error('[ChecklistResponder] Erro ao carregar foto anexada:', url);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Foto anexada salva {index + 1}</p>
                            <p className="text-xs text-muted-foreground">Do rascunho</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhotoUrls(prev => {
                                const urls = prev[`${pergunta.id}_anexo`] || [];
                                return {
                                  ...prev,
                                  [`${pergunta.id}_anexo`]: urls.filter((_, i) => i !== index),
                                };
                              });
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                      {/* Mostrar fotos anexadas novas (File objects) */}
                      {(photoAnswers[`${pergunta.id}_anexo`] || []).map((foto, index) => (
                        <div key={`file-anexo-${index}`} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                          <img
                            src={URL.createObjectURL(foto)}
                            alt={`Foto anexada ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Foto anexada {index + 1}</p>
                            <p className="text-xs text-muted-foreground">{foto.name}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFoto(`${pergunta.id}_anexo`, index)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                    <ImageUpload
                      onChange={file => handleFotoChange(`${pergunta.id}_anexo`, file, false)}
                      label="Anexar foto"
                      description="Toque para capturar ou selecionar uma imagem"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes" className="text-base md:text-sm">Observações gerais</Label>
        <Textarea
          id="observacoes"
          value={observacoes}
          onChange={event => setObservacoes(event.target.value)}
          placeholder="Adicione comentários relevantes sobre o checklist."
          className="min-h-[100px] text-base md:text-sm"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          className="h-12 md:h-10 text-base md:text-sm"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 md:h-10 text-base md:text-sm font-semibold w-full"
        >
          {submitting ? 'Enviando...' : 'Enviar checklist'}
        </Button>
      </div>

      {/* Dialog de Assinatura */}
      <Dialog
        open={showAssinaturaDialog}
        onOpenChange={open => {
          setShowAssinaturaDialog(open);
          if (!open) {
            // Resetar estado quando fechar sem enviar
            setCapturandoAssinatura(false);
            setAssinaturaFoto(null);
            setLocalizacao(null);
            setEndereco(null);
            setBuscandoEndereco(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar Checklist</DialogTitle>
            <DialogDescription>
              Para finalizar o checklist, é necessário capturar uma foto e confirmar sua localização.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto de Assinatura</Label>
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">Aguardando acesso à câmera...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Posicione-se em frente à câmera para capturar sua foto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Localização</Label>
              {localizacao ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
                  {endereco ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Endereço:</p>
                        <p className="text-foreground font-medium">{endereco}</p>
                      </div>
                      <Separator />
                    </>
                  ) : buscandoEndereco ? (
                    <p className="text-muted-foreground text-xs">
                      Buscando endereço...
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Latitude:</p>
                      <p className="text-foreground">
                        {localizacao.coords.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Longitude:</p>
                      <p className="text-foreground">
                        {localizacao.coords.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Precisão: {Math.round(localizacao.coords.accuracy || 0)}m
                  </p>
                </div>
              ) : (
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  A localização será capturada ao confirmar
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAssinaturaDialog(false);
                stream?.getTracks().forEach(t => t.stop());
              }}
              disabled={capturandoAssinatura}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCapturarAssinatura}
              disabled={capturandoAssinatura || !stream}
            >
              {capturandoAssinatura ? 'Capturando...' : 'Capturar Foto'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Após capturar sua foto, o gerente precisará assinar no celular
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Assinatura do Gerente */}
      <Dialog
        open={showAssinaturaGerenteDialog}
        onOpenChange={open => {
          if (!open && !submitting) {
            // Permitir cancelar apenas se não estiver enviando
            setShowAssinaturaGerenteDialog(false);
            setAssinaturaGerenteDataUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Assinatura do Gerente</DialogTitle>
            <DialogDescription className="text-base">
              Entregue o celular para o gerente assinar na tela abaixo com o dedo para confirmar a visualização deste relatório.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <SignaturePad
              onSave={async (signatureDataUrl) => {
                setAssinaturaGerenteDataUrl(signatureDataUrl);
                setShowAssinaturaGerenteDialog(false);
                // Enviar checklist com ambas as assinaturas
                await enviarChecklist(assinaturaFoto, localizacao, signatureDataUrl);
              }}
              onCancel={() => {
                if (!submitting) {
                  setShowAssinaturaGerenteDialog(false);
                  setAssinaturaGerenteDataUrl(null);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

