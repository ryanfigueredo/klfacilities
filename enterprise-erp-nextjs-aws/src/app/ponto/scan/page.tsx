'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  ClipboardList,
  Camera,
  MapPin,
  AlertTriangle,
  Info,
  Phone,
  Lock,
  FileText,
  Check,
  Loader2,
  Building,
  Coffee,
  DoorOpen,
  Clock,
  Zap,
} from 'lucide-react';
import { isUniversalQRCode } from '@/lib/ponto-universal';

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [unidade, setUnidade] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [tipo, setTipo] = useState<
    | 'ENTRADA'
    | 'INTERVALO_INICIO'
    | 'INTERVALO_FIM'
    | 'SAIDA'
    | 'HORA_EXTRA_INICIO'
    | 'HORA_EXTRA_FIM'
  >('ENTRADA');
  const [msg, setMsg] = useState<string>('');
  const [msgType, setMsgType] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');
  const [protocolo, setProtocolo] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [funcionario, setFuncionario] = useState<any>(null);
  const [verificandoCpf, setVerificandoCpf] = useState(false);
  const [cpfError, setCpfError] = useState<string>('');
  const [termoAssinado, setTermoAssinado] = useState(false);
  const [verificandoTermo, setVerificandoTermo] = useState(false);
  const [mostrarTermo, setMostrarTermo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [tiposBatidos, setTiposBatidos] = useState<string[]>([]);
  const [verificandoTipos, setVerificandoTipos] = useState(false);
  const [reconhecendoFace, setReconhecendoFace] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [faceDescriptors, setFaceDescriptors] = useState<any[]>([]);
  const [faceDetectionCount, setFaceDetectionCount] = useState<{
    [key: string]: number;
  }>({});
  const [faceDetectionStartTime, setFaceDetectionStartTime] = useState<{
    [key: string]: number;
  }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const codeParam = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    return u.searchParams.get('code') || '';
  }, []);

  useEffect(() => {
    if (!codeParam) return;
    setCode(codeParam);

    // Verificar se é QR universal
    if (isUniversalQRCode(codeParam)) {
      setUnidade('QR Universal - Identifique-se pelo CPF');
      setMsg(
        'QR Code Universal ativo. Digite seu CPF ou use reconhecimento facial'
      );
      setMsgType('info');
      return;
    }

    // QR normal: resolver unidade
    fetch(`/api/ponto/resolve?code=${encodeURIComponent(codeParam)}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Erro ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(j => {
        if (j?.universal) {
          // QR universal reconhecido pelo endpoint
          setUnidade('QR Universal - Identifique-se pelo CPF');
          setMsg(
            'QR Code Universal ativo. Digite seu CPF ou use reconhecimento facial'
          );
          setMsgType('info');
        } else if (j?.unidadeNome) {
          setUnidade(j.unidadeNome);
        } else {
          setMsg(j?.error || 'QR inválido');
          setMsgType('error');
        }
      })
      .catch((error) => {
        console.error('Erro ao resolver QR code:', error);
        setMsg('Erro ao conectar ao servidor. Verifique sua conexão e tente novamente.');
        setMsgType('error');
      });
  }, [codeParam]);

  // Carregar modelos do face-api.js e descritores faciais
  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        // Carregar modelos do face-api.js
        const faceapi = await import('face-api.js');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setFaceApiLoaded(true);

        // Buscar descritores faciais dos funcionários da unidade
        const res = await fetch(
          `/api/ponto/face-descriptors?code=${encodeURIComponent(code)}`
        );
        const data = await res.json();
        if (data.funcionarios) {
          setFaceDescriptors(data.funcionarios);
        }
      } catch (error) {
        console.error('Erro ao carregar face-api.js:', error);
        // Continuar mesmo se não conseguir carregar (modo manual ainda funciona)
      }
    })();
  }, [code]);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
          // Iniciar reconhecimento facial após o vídeo começar
          if (faceApiLoaded && faceDescriptors.length > 0) {
            startFaceRecognition();
          }
        }
      } catch {}
    })();
    return () => {
      currentStream?.getTracks().forEach(t => t.stop());
    };
  }, [faceApiLoaded, faceDescriptors.length]);

  const captureSelfie = async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    const w = 640,
      h = Math.round((v.videoHeight / v.videoWidth) * 640) || 480;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.8));
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const checkTermoCiencia = async (cpfValue: string) => {
    const cpfClean = cpfValue.replace(/\D/g, '');
    if (cpfClean.length !== 11) return;

    setVerificandoTermo(true);
    try {
      const res = await fetch(
        `/api/ponto/termo-ciencia?cpf=${encodeURIComponent(cpfClean)}`
      );
      const data = await res.json();

      if (res.ok) {
        setTermoAssinado(data.assinado);
      }
    } catch (error) {
      console.error('Erro ao verificar termo:', error);
    } finally {
      setVerificandoTermo(false);
    }
  };

  const assinarTermo = async (): Promise<boolean> => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) return false;

    try {
      const deviceId = localStorage.getItem('deviceId') || '';
      const userAgent = navigator.userAgent;

      const res = await fetch('/api/ponto/termo-ciencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ''),
          deviceId,
          userAgent,
          ip: '',
        }),
      });

      const data = await res.json();

      if (res.ok || res.status === 409) {
        setTermoAssinado(true);
        setMostrarTermo(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao assinar termo:', error);
      return false;
    }
  };

  const verificarTiposBatidos = async (cpfValue: string) => {
    const cpfClean = cpfValue.replace(/\D/g, '');
    if (!cpfClean || cpfClean.length !== 11) return;

    setVerificandoTipos(true);
    try {
      // Precisamos do unidadeSlug, mas temos apenas o code
      // Vamos buscar a unidade primeiro ou usar o code diretamente
      const response = await fetch(
        `/api/ponto/verificar-hoje?cpf=${encodeURIComponent(cpfClean)}&code=${encodeURIComponent(code)}`
      );
      const data = await response.json();
      if (data.tiposBatidos) {
        setTiposBatidos(data.tiposBatidos);
      }
    } catch (error) {
      console.error('Erro ao verificar tipos batidos:', error);
    } finally {
      setVerificandoTipos(false);
    }
  };

  // Função para iniciar reconhecimento facial contínuo
  const startFaceRecognition = async () => {
    if (
      !videoRef.current ||
      !faceApiLoaded ||
      faceDescriptors.length === 0 ||
      reconhecendoFace
    ) {
      return;
    }

    setReconhecendoFace(true);
    const faceapi = await import('face-api.js');

    // Preparar descritores para comparação
    const labeledDescriptors = faceDescriptors.map(f => {
      const descriptor = Array.isArray(f.descriptor)
        ? new Float32Array(f.descriptor)
        : new Float32Array(Object.values(f.descriptor));
      return new faceapi.LabeledFaceDescriptors(f.cpf || f.id, [descriptor]);
    });

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

    const detectFace = async () => {
      if (!videoRef.current || !reconhecendoFace || cpf) {
        // Parar se já encontrou CPF
        setReconhecendoFace(false);
        setFaceDetectionCount({});
        setFaceDetectionStartTime({});
        return;
      }

      try {
        // Detectar face no vídeo
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

          if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.6) {
            // Encontrou uma correspondência!
            const funcionarioEncontrado = faceDescriptors.find(
              f => (f.cpf || f.id) === bestMatch.label
            );

            if (funcionarioEncontrado && funcionarioEncontrado.cpf) {
              const cpfFormatado = formatCPF(funcionarioEncontrado.cpf);
              const matchKey = bestMatch.label;

              // Iniciar contagem de tempo se for a primeira detecção desta face
              setFaceDetectionStartTime(prev => {
                if (!prev[matchKey]) {
                  return { ...prev, [matchKey]: Date.now() };
                }
                return prev;
              });

              // Contar quantas vezes detectou esta face
              setFaceDetectionCount(prev => ({
                ...prev,
                [matchKey]: (prev[matchKey] || 0) + 1,
              }));

              // Verificar se passou 3 segundos desde a primeira detecção
              const startTime = faceDetectionStartTime[matchKey] || Date.now();
              const elapsedTime = Date.now() - startTime;
              const detectionCount = faceDetectionCount[matchKey] || 0;

              // Aguardar 3 segundos e pelo menos 3 detecções consecutivas antes de preencher
              if (
                elapsedTime >= 3000 &&
                detectionCount >= 3 &&
                cpf !== cpfFormatado
              ) {
                setCpf(cpfFormatado);
                // Verificar CPF automaticamente
                await verifyCPF(cpfFormatado);
                setMsg('✅ Reconhecimento facial realizado com sucesso!');
                setMsgType('success');
                // Parar reconhecimento após encontrar
                setReconhecendoFace(false);
                setFaceDetectionCount({});
                setFaceDetectionStartTime({});
                return;
              } else if (elapsedTime < 3000) {
                // Mostrar mensagem de aguardando reconhecimento
                const segundosRestantes = Math.ceil(
                  (3000 - elapsedTime) / 1000
                );
                setMsg(`🔍 Reconhecendo... Aguarde ${segundosRestantes}s`);
                setMsgType('info');
              }
            }
          } else {
            // Resetar contadores se não encontrou match
            setFaceDetectionCount({});
            setFaceDetectionStartTime({});
            setMsg(
              'Rosto não reconhecido. Digite seu CPF abaixo ou posicione-se melhor na câmera'
            );
            setMsgType('info');
          }
        } else {
          // Resetar contadores se não detectou face
          setFaceDetectionCount({});
          setFaceDetectionStartTime({});
          setMsg(
            'Posicione seu rosto na câmera para reconhecimento automático ou digite seu CPF'
          );
          setMsgType('info');
        }

        // Continuar detectando a cada 500ms
        setTimeout(detectFace, 500);
      } catch (error) {
        console.error('Erro ao detectar face:', error);
        // Continuar tentando mesmo com erro
        setTimeout(detectFace, 1000);
      }
    };

    detectFace();
  };

  const verifyCPF = async (cpfValue: string) => {
    const cpfClean = cpfValue.replace(/\D/g, '');
    if (!cpfValue || cpfClean.length !== 11) {
      setCpfError('');
      return;
    }

    setVerificandoCpf(true);
    setCpfError('');
    try {
      const response = await fetch(
        `/api/ponto/funcionario?cpf=${encodeURIComponent(cpfClean)}&code=${encodeURIComponent(code)}`
      );
      const data = await response.json();

      if (data.funcionario) {
        setFuncionario(data.funcionario);
        setCpfError('');
        setMsg('');
        setMsgType('info');

        // Se for QR universal, atualizar a unidade mostrada na tela
        if (isUniversalQRCode(code) && data.funcionario.unidade) {
          setUnidade(data.funcionario.unidade);
          setMsg(`✅ Identificado! Unidade: ${data.funcionario.unidade}`);
          setMsgType('success');
        }

        // Se funcionário não tem foto facial cadastrada, mostrar aviso
        if (!data.funcionario.temFotoFacial) {
          setMsg(
            '💡 Sua primeira foto será cadastrada automaticamente ao bater o ponto'
          );
          setMsgType('info');
        }

        checkTermoCiencia(cpfValue);
        verificarTiposBatidos(cpfValue);
      } else {
        setFuncionario(null);
        setCpfError(
          'Funcionário não cadastrado ou CPF incorreto. Entre em contato com o supervisor.'
        );
        setTiposBatidos([]);
      }
    } catch (error) {
      setFuncionario(null);
      setCpfError('Erro ao verificar CPF. Tente novamente.');
      setTiposBatidos([]);
    } finally {
      setVerificandoCpf(false);
    }
  };

  const submit = async (tipoSelecionado: typeof tipo) => {
    if (!code) {
      setMsg('QR inválido');
      setMsgType('error');
      return;
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      setMsg(' Por favor, informe seu CPF para registrar o ponto');
      setMsgType('warning');
      return;
    }

    if (!funcionario) {
      setMsg(' Por favor, informe seu CPF primeiro');
      setMsgType('warning');
      return;
    }

    // Validar se já bateu este tipo hoje
    if (tiposBatidos.includes(tipoSelecionado)) {
      const tipoNome =
        tipoSelecionado === 'ENTRADA'
          ? 'Entrada'
          : tipoSelecionado === 'SAIDA'
            ? 'Saída'
            : tipoSelecionado === 'INTERVALO_INICIO'
              ? 'Intervalo - Início'
              : tipoSelecionado === 'INTERVALO_FIM'
                ? 'Intervalo - Término'
                : tipoSelecionado === 'HORA_EXTRA_INICIO'
                  ? 'Hora Extra - Início'
                  : 'Hora Extra - Saída';
      setMsg(`Você já registrou ${tipoNome} hoje.`);
      setMsgType('warning');
      return;
    }

    // Se não assinou o termo, mostrar modal primeiro
    if (!termoAssinado && funcionario) {
      setTipo(tipoSelecionado);
      setMostrarTermo(true);
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      // GPS é obrigatório
      if (!navigator.geolocation) {
        setMsg(
          'GPS não disponível neste dispositivo. Ative a localização e tente novamente.'
        );
        setMsgType('error');
        setLoading(false);
        return;
      }

      const pos = await new Promise<GeolocationPosition | null>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            p => resolve(p),
            error => {
              let errorMsg = 'Erro ao capturar GPS: ';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMsg +=
                    'Permissão de localização negada. Ative nas configurações do navegador.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMsg +=
                    'Localização indisponível. Verifique se o GPS está ativado.';
                  break;
                case error.TIMEOUT:
                  errorMsg +=
                    'Tempo esgotado. Aguarde alguns segundos e tente novamente.';
                  break;
                default:
                  errorMsg += 'Erro desconhecido. Tente novamente.';
              }
              reject(new Error(errorMsg));
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        }
      );

      if (!pos || !pos.coords) {
        setMsg(
          'Não foi possível capturar sua localização. Verifique se o GPS está ativado.'
        );
        setMsgType('error');
        setLoading(false);
        return;
      }

      const accuracy = pos.coords.accuracy || 0;
      if (accuracy > 100) {
        setMsg(
          ` GPS com baixa precisão (${Math.round(accuracy)}m). Posicione-se em área aberta.`
        );
        setMsgType('warning');
      }

      const selfie = await captureSelfie();
      const fd = new FormData();
      fd.append('code', code);
      fd.append('tipo', tipoSelecionado);
      fd.append('cpf', cpf.replace(/\D/g, ''));
      fd.append('lat', String(pos.coords.latitude));
      fd.append('lng', String(pos.coords.longitude));
      fd.append('accuracy', String(Math.round(accuracy)));

      if (selfie) fd.append('selfie', selfie, 'selfie.jpg');
      fd.append('deviceId', (localStorage.getItem('deviceId') || '') as string);

      let r: Response;
      let j: any;
      
      try {
        r = await fetch('/api/ponto/bater', { 
          method: 'POST', 
          body: fd,
          // Adicionar timeout implícito através de AbortController se necessário
        });
      } catch (fetchError: any) {
        // Erro de rede (conexão falhou)
        console.error('Erro de conexão ao bater ponto:', fetchError);
        const errorMessage = fetchError?.message || 'Erro desconhecido';
        throw new Error(
          `Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente. Erro: ${errorMessage}`
        );
      }
      
      try {
        j = await r.json();
      } catch (jsonError) {
        // Resposta não é JSON válido
        console.error('Erro ao parsear resposta JSON:', jsonError, r.status, r.statusText);
        throw new Error(
          `Erro ao processar resposta do servidor (Status: ${r.status}). Tente novamente.`
        );
      }
      
      if (!r.ok) {
        if (r.status === 409 && j.tipoBatido) {
          setTiposBatidos(prev => [...prev, j.tipoBatido]);
        }
        throw new Error(j?.error || `Erro ao bater ponto (Status: ${r.status})`);
      }
      setMsg(`Ponto registrado com sucesso na unidade ${j.unidade}`);
      setMsgType('success');
      if (j?.protocolo) setProtocolo(j.protocolo);

      setTiposBatidos(prev => [...prev, tipoSelecionado]);

      // PROCESSAR FOTO FACIAL AUTOMATICAMENTE (se funcionário existe e tem selfie)
      // Gerar descritor facial da selfie e cadastrar/atualizar automaticamente
      // Só processa se funcionário não tem foto cadastrada OU se quer atualizar
      // Tentar processar mesmo se faceApiLoaded for false (carregar dinamicamente)
      if (funcionario?.id && selfie) {
        console.log(
          '🔄 Iniciando processamento facial para funcionário:',
          funcionario.id
        );
        try {
          const faceapi = await import('face-api.js');
          console.log('✅ face-api.js carregado');

          // Carregar modelos se ainda não carregados
          try {
            console.log('🔄 Carregando modelos face-api...');
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
              faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
              faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            ]);
            console.log('✅ Modelos face-api carregados');
          } catch (loadError) {
            console.error('❌ Erro ao carregar modelos face-api:', loadError);
            // Continuar mesmo se não conseguir carregar - tentar usar modelos já carregados
          }

          // Criar uma imagem a partir do blob da selfie
          const img = new Image();
          const imgUrl = URL.createObjectURL(selfie);
          img.src = imgUrl;

          await new Promise((resolve, reject) => {
            img.onload = () => {
              console.log('✅ Imagem carregada');
              resolve(null);
            };
            img.onerror = err => {
              console.error('❌ Erro ao carregar imagem:', err);
              reject(err);
            };
            setTimeout(
              () => reject(new Error('Timeout ao carregar imagem')),
              10000
            );
          });

          // Detectar face e gerar descritor
          console.log('🔄 Detectando face...');
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            console.log('✅ Face detectada! Gerando descritor...');
            // Converter descritor para array
            const descriptorArray = Array.from(detection.descriptor);
            console.log(
              '✅ Descritor gerado:',
              descriptorArray.length,
              'dimensões'
            );

            // Enviar para processar e cadastrar
            const processFd = new FormData();
            processFd.append('selfie', selfie, 'selfie.jpg');
            processFd.append('funcionarioId', funcionario.id);
            processFd.append('descriptor', JSON.stringify(descriptorArray));

            console.log('🔄 Enviando para API process-face...');
            // Processar e aguardar resposta
            const processRes = await fetch('/api/ponto/process-face', {
              method: 'POST',
              body: processFd,
            });

            const processData = await processRes.json();
            console.log('📥 Resposta da API:', processRes.status, processData);

            if (processRes.ok) {
              console.log('✅ Foto facial cadastrada com sucesso!');
              // Recarregar descritores faciais para incluir o novo funcionário
              const descRes = await fetch(
                `/api/ponto/face-descriptors?code=${encodeURIComponent(code)}`
              );
              const descData = await descRes.json();
              if (descData.funcionarios) {
                setFaceDescriptors(descData.funcionarios);
              }

              // Mostrar mensagem de sucesso apenas se era a primeira foto
              if (!funcionario.temFotoFacial) {
                setMsg(
                  '✅ Foto facial cadastrada! Agora você pode usar reconhecimento facial'
                );
                setMsgType('success');
              }
            } else {
              console.error('❌ Erro ao processar foto:', processData);
              setMsg(
                ` Foto processada, mas houve erro ao cadastrar: ${processData.error || 'Erro desconhecido'}`
              );
              setMsgType('warning');
            }
          } else {
            console.warn(' Nenhuma face detectada na selfie');
            setMsg(
              ' Nenhuma face detectada na foto. A foto não foi cadastrada para reconhecimento facial.'
            );
            setMsgType('warning');
          }

          URL.revokeObjectURL(imgUrl);
        } catch (error: any) {
          // Não bloquear o registro de ponto se falhar o processamento facial
          console.error('❌ Erro ao gerar descritor facial:', error);
          setMsg(
            ` Erro ao processar foto facial: ${error?.message || 'Erro desconhecido'}. O ponto foi registrado normalmente.`
          );
          setMsgType('warning');
        }
      } else {
        console.log('⏭️ Pulando processamento facial:', {
          temFuncionario: !!funcionario?.id,
          temSelfie: !!selfie,
        });
      }

      if (cpf) {
        setTimeout(() => verificarTiposBatidos(cpf), 1000);
      }
    } catch (e: any) {
      setMsg(`${e?.message || 'Falha ao registrar ponto'}`);
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  const baterPonto = async () => {
    if (!termoAssinado) {
      const assinado = await assinarTermo();
      if (!assinado) {
        setMsg('Erro ao assinar termo de ciência');
        setMsgType('error');
        return;
      }
    }
    await submit(tipo);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Sistema de Ponto Eletrônico
        </h1>
        {unidade && <p className="text-xl text-gray-600 mt-2">{unidade}</p>}
        <div className="mt-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
          Conforme Portaria 671/2021 (REP-P)
        </div>
      </div>

      {/* Mensagem de sucesso fixa no topo */}
      {msg && msgType === 'success' && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 shadow-lg animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-green-900 text-lg mb-1">
                Ponto Registrado com Sucesso!
              </div>
              <div className="text-green-800 text-base">{msg}</div>
              {protocolo && (
                <div className="mt-3 pt-3 border-t border-green-300">
                  <div className="text-sm font-semibold text-green-900">
                    Protocolo:
                  </div>
                  <code className="text-base block mt-1 font-mono bg-white px-2 py-1 rounded border border-green-300">
                    {protocolo}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campo de CPF */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xl font-semibold text-gray-700">
          <User className="h-5 w-5" />
          Digite seu CPF:
        </label>
        <div className="relative">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cpf}
            onChange={e => {
              // Parar reconhecimento facial quando usuário começar a digitar
              if (reconhecendoFace) {
                setReconhecendoFace(false);
                setFaceDetectionCount({});
                setFaceDetectionStartTime({});
                setMsg('Digite seu CPF ou aguarde o reconhecimento facial');
                setMsgType('info');
              }

              // Remove tudo que não é número primeiro
              const onlyNumbers = e.target.value.replace(/\D/g, '');
              // Limita a 11 dígitos (CPF)
              const limited = onlyNumbers.slice(0, 11);
              // Aplica formatação enquanto digita
              const formatted = formatCPF(limited);
              setCpf(formatted);
              // Limpa erro quando está digitando
              if (cpfError) {
                setCpfError('');
              }
              // Limpa funcionário se CPF foi alterado
              if (funcionario && onlyNumbers.length < 11) {
                setFuncionario(null);
                setTiposBatidos([]);
              }
              // Verifica quando completa 11 dígitos
              if (limited.length === 11) {
                verifyCPF(formatted);
              } else {
                setFuncionario(null);
                setTiposBatidos([]);
              }
            }}
            placeholder="000.000.000-00"
            maxLength={14}
            className={`w-full border-2 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              cpfError
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                : funcionario
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
          />
          {verificandoCpf && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        {/* Mensagem de erro do CPF - aparece logo abaixo do campo */}
        {cpfError && (
          <div className="bg-red-50 text-red-800 border border-red-300 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
              <span>{cpfError}</span>
            </div>
          </div>
        )}
        {/* Mensagem de erro específica para geofence/localização - aparece logo abaixo do CPF */}
        {msg &&
          msgType === 'error' &&
          (msg.includes('local cadastrado') ||
            msg.includes('fora da área') ||
            msg.includes('localização')) && (
            <div className="bg-red-50 text-red-800 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">Erro de Localização</div>
                  <div className="text-base">{msg}</div>
                  {msg.includes('fora da área') && (
                    <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                      <div className="text-sm">
                        <strong className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4" />O que fazer?
                        </strong>
                        <ul className="mt-1 space-y-1 text-xs text-red-700">
                          <li>
                            • Você precisa estar fisicamente na unidade para
                            registrar o ponto
                          </li>
                          <li>• Verifique se está no local correto</li>
                          <li>• Ative o GPS do seu dispositivo</li>
                          <li>
                            • Se o problema persistir, entre em contato com o RH
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        {funcionario && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-green-900 text-lg">
                    Funcionário Identificado
                  </h3>
                </div>
                <div className="space-y-2 text-base">
                  <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                    <div className="text-xs text-green-600 font-medium mb-0.5">
                      Nome Completo
                    </div>
                    <div className="text-green-900 font-semibold text-lg">
                      {funcionario.nome}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                      <div className="text-xs text-green-600 font-medium mb-0.5">
                        CPF
                      </div>
                      <div className="text-green-900 font-semibold text-base">
                        {funcionario.cpf}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                      <div className="text-xs text-green-600 font-medium mb-0.5">
                        Unidade
                      </div>
                      <div className="text-green-900 font-semibold text-sm">
                        {funcionario.unidade}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm text-green-700 flex items-center gap-1.5">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Confirme se os dados acima estão corretos antes de
                      registrar o ponto
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Tipo de Marcação */}
      {funcionario && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xl font-semibold text-gray-700">
            <ClipboardList className="h-5 w-5" />
            Tipo de marcação:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => submit('ENTRADA')}
              disabled={
                loading || tiposBatidos.includes('ENTRADA') || verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('ENTRADA')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Building
                className={`h-7 w-7 ${tiposBatidos.includes('ENTRADA') ? 'text-gray-400' : 'text-blue-600'}`}
              />
              <span className="font-semibold">Entrada</span>
              {tiposBatidos.includes('ENTRADA') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => submit('SAIDA')}
              disabled={
                loading || tiposBatidos.includes('SAIDA') || verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('SAIDA')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <DoorOpen
                className={`h-7 w-7 ${tiposBatidos.includes('SAIDA') ? 'text-gray-400' : 'text-red-600'}`}
              />
              <span className="font-semibold">Saída</span>
              {tiposBatidos.includes('SAIDA') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => submit('INTERVALO_INICIO')}
              disabled={
                loading ||
                tiposBatidos.includes('INTERVALO_INICIO') ||
                verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('INTERVALO_INICIO')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Coffee
                className={`h-7 w-7 ${tiposBatidos.includes('INTERVALO_INICIO') ? 'text-gray-400' : 'text-orange-600'}`}
              />
              <span className="font-semibold">Intervalo - Início</span>
              {tiposBatidos.includes('INTERVALO_INICIO') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => submit('INTERVALO_FIM')}
              disabled={
                loading ||
                tiposBatidos.includes('INTERVALO_FIM') ||
                verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('INTERVALO_FIM')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Clock
                className={`h-7 w-7 ${tiposBatidos.includes('INTERVALO_FIM') ? 'text-gray-400' : 'text-green-600'}`}
              />
              <span className="font-semibold">Intervalo - Término</span>
              {tiposBatidos.includes('INTERVALO_FIM') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => submit('HORA_EXTRA_INICIO')}
              disabled={
                loading ||
                tiposBatidos.includes('HORA_EXTRA_INICIO') ||
                verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('HORA_EXTRA_INICIO')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Zap
                className={`h-7 w-7 ${tiposBatidos.includes('HORA_EXTRA_INICIO') ? 'text-gray-400' : 'text-purple-600'}`}
              />
              <span className="font-semibold">Hora Extra - Início</span>
              {tiposBatidos.includes('HORA_EXTRA_INICIO') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => submit('HORA_EXTRA_FIM')}
              disabled={
                loading ||
                tiposBatidos.includes('HORA_EXTRA_FIM') ||
                verificandoTipos
              }
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all text-lg ${
                tiposBatidos.includes('HORA_EXTRA_FIM')
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Zap
                className={`h-7 w-7 ${tiposBatidos.includes('HORA_EXTRA_FIM') ? 'text-gray-400' : 'text-indigo-600'}`}
              />
              <span className="font-semibold">Hora Extra - Saída</span>
              {tiposBatidos.includes('HORA_EXTRA_FIM') && (
                <span className="text-xs text-gray-500">Já registrado</span>
              )}
            </button>
          </div>
          {verificandoTipos && (
            <div className="text-center text-base text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Verificando registros de hoje...
            </div>
          )}
        </div>
      )}

      {/* Selfie */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Camera className="h-5 w-5" />
          Selfie obrigatória para validação:
        </div>
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="absolute bottom-2 right-2 bg-green-500 text-white text-sm px-2 py-1 rounded">
            Câmera frontal ativa
          </div>
          {reconhecendoFace && !cpf && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reconhecendo face...</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {faceApiLoaded && faceDescriptors.length > 0 && !cpf
            ? 'Posicione seu rosto na câmera para reconhecimento automático (aguarde 3s) ou digite seu CPF abaixo'
            : 'A foto será capturada automaticamente ao confirmar o ponto'}
        </p>
      </div>

      {/* Informações de Conformidade */}
      <div className="space-y-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-base mb-2">
                Conformidade Legal
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Portaria 671/2021 (REP-P):</strong> Sistema de
                    Registro Eletrônico de Ponto certificado e em conformidade
                    com a legislação trabalhista.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>LGPD:</strong> Seus dados pessoais são protegidos e
                    tratados conforme a Lei Geral de Proteção de Dados.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Validação:</strong> GPS e selfie obrigatórios para
                    garantir a autenticidade do registro.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Auditoria:</strong> Todos os registros são
                    criptografados, auditados e armazenados com segurança.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm text-green-800">
            <strong className="flex items-center gap-2 mb-1">
              <Lock className="h-3.5 w-3.5" />
              Segurança dos Dados
            </strong>
            <p className="text-green-700">
              Suas informações são protegidas com criptografia de ponta a ponta
              e armazenadas em servidores seguros. O acesso é restrito e
              monitorado.
            </p>
          </div>
        </div>
      </div>

      {/* Mensagens gerais (warning, info, outros erros) - aparecem no final */}
      {/* Sucesso já aparece no topo, então não mostrar aqui */}
      {msg &&
        msgType !== 'success' &&
        !(
          msgType === 'error' &&
          (msg.includes('local cadastrado') ||
            msg.includes('fora da área') ||
            msg.includes('localização'))
        ) && (
          <div
            className={`text-base p-4 rounded-lg ${
              msgType === 'warning'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : msgType === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-2">
              {msgType === 'warning' && (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Atenção
                </>
              )}
              {msgType === 'error' && (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Erro
                </>
              )}
              {msgType === 'info' && (
                <>
                  <Info className="h-5 w-5" />
                  Informação
                </>
              )}
            </div>
            <div className="whitespace-pre-line">{msg}</div>
          </div>
        )}

      {/* Modal de Termo de Ciência */}
      {mostrarTermo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <FileText className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Termo de Ciência
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {funcionario?.nome}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-gray-700 space-y-3">
                <p className="font-semibold text-gray-900">
                  Ao bater ponto, você concorda que:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    Os dados coletados (CPF, localização GPS, selfie) serão
                    utilizados exclusivamente para registro de ponto.
                  </li>
                  <li>
                    Seus dados são protegidos pela LGPD e não serão
                    compartilhados com terceiros sem sua autorização.
                  </li>
                  <li>
                    O registro de ponto é obrigatório e está em conformidade com
                    a Portaria 671/2021 (REP-P).
                  </li>
                  <li>
                    É proibido registrar ponto em nome de outra pessoa ou fora
                    do local de trabalho.
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarTermo(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={baterPonto}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    'Concordo e Confirmo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
