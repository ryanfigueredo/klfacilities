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

export default function PontoBySlugPage() {
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

  const slug = useMemo(() => {
    const u = new URL(window.location.href);
    const parts = u.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/ponto/slug?slug=${encodeURIComponent(slug)}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Erro ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(j => {
        if (j?.code) {
          setCode(j.code);
          setUnidade(j.unidadeNome);
        } else {
          setMsg(j?.error || 'Falha ao carregar unidade');
          setMsgType('error');
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar unidade:', error);
        setMsg('Erro ao conectar ao servidor. Verifique sua conexão e tente novamente.');
        setMsgType('error');
      });
  }, [slug]);

  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        streamRef.current = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch {}
    })();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

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
        // Se não assinou, mostrar termo quando tentar bater ponto
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
          ip: '', // IP será capturado no backend
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
      const response = await fetch(
        `/api/ponto/verificar-hoje?cpf=${encodeURIComponent(cpfClean)}&unidade=${encodeURIComponent(slug)}`
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
        `/api/ponto/funcionario?cpf=${encodeURIComponent(cpfClean)}&unidade=${encodeURIComponent(slug)}`
      );
      const data = await response.json();

      if (data.funcionario) {
        setFuncionario(data.funcionario);
        setCpfError('');
        // Não mostrar mensagem de sucesso aqui, o card já mostra claramente
        setMsg('');
        setMsgType('info');

        // Se funcionário não tem foto facial cadastrada, mostrar aviso
        if (!data.funcionario.temFotoFacial) {
          setMsg(
            '💡 Sua primeira foto será cadastrada automaticamente ao bater o ponto'
          );
          setMsgType('info');
        }

        // Verificar se já assinou o termo
        checkTermoCiencia(cpfValue);

        // Verificar quais tipos já foram batidos hoje
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

  const submit = async (tipoSelecionado?: typeof tipo) => {
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

    // Usar tipo selecionado ou o tipo atual
    const tipoParaUsar = tipoSelecionado || tipo;

    // Validar se já bateu este tipo hoje
    if (tiposBatidos.includes(tipoParaUsar)) {
      const tipoNome =
        tipoParaUsar === 'ENTRADA'
          ? 'Entrada'
          : tipoParaUsar === 'SAIDA'
            ? 'Saída'
            : tipoParaUsar === 'INTERVALO_INICIO'
              ? 'Intervalo - Início'
              : tipoParaUsar === 'INTERVALO_FIM'
                ? 'Intervalo - Término'
                : tipoParaUsar === 'HORA_EXTRA_INICIO'
                  ? 'Hora Extra - Início'
                  : 'Hora Extra - Saída';
      setMsg(`Você já registrou ${tipoNome} hoje.`);
      setMsgType('warning');
      return;
    }

    // Se não assinou o termo, mostrar modal primeiro
    if (!termoAssinado && funcionario) {
      setTipo(tipoParaUsar);
      setMostrarTermo(true);
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      // GPS é obrigatório - tentar capturar com timeout maior
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
              timeout: 10000, // 10 segundos
              maximumAge: 0, // Sempre buscar posição atual
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

      // Validar precisão do GPS (se accuracy > 100m, avisar mas permitir)
      const accuracy = pos.coords.accuracy || 0;
      if (accuracy > 100) {
        setMsg(
          ` GPS com baixa precisão (${Math.round(accuracy)}m). Posicione-se em área aberta.`
        );
        setMsgType('warning');
        // Continuar mesmo assim, mas avisar
      }

      const selfie = await captureSelfie();
      const fd = new FormData();
      fd.append('code', code);
      fd.append('tipo', tipoParaUsar);
      fd.append('cpf', cpf.replace(/\D/g, ''));
      fd.append('lat', String(pos.coords.latitude));
      fd.append('lng', String(pos.coords.longitude));
      fd.append('accuracy', String(Math.round(accuracy)));

      if (selfie) fd.append('selfie', selfie, 'selfie.jpg');
      fd.append('deviceId', (localStorage.getItem('deviceId') || '') as string);

      let r: Response;
      let j: any;
      
      try {
        r = await fetch('/api/ponto/bater', { method: 'POST', body: fd });
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
        // Se for erro 409 (já batido), atualizar lista de tipos batidos
        if (r.status === 409 && j.tipoBatido) {
          setTiposBatidos(prev => [...prev, j.tipoBatido]);
        }
        throw new Error(j?.error || `Erro ao bater ponto (Status: ${r.status})`);
      }
      setMsg(`Ponto registrado com sucesso na unidade ${j.unidade}`);
      setMsgType('success');

      // Atualizar lista de tipos batidos
      setTiposBatidos(prev => [...prev, tipoParaUsar]);

      // PROCESSAR FOTO FACIAL AUTOMATICAMENTE (se funcionário existe e tem selfie)
      // Gerar descritor facial da selfie e cadastrar/atualizar automaticamente
      // Só processa se funcionário não tem foto cadastrada OU se quer atualizar
      if (funcionario?.id && selfie) {
        console.log(
          '🔄 Iniciando processamento facial para funcionário:',
          funcionario.id
        );
        try {
          // Carregar face-api.js dinamicamente
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
            // Continuar mesmo se não conseguir carregar
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

      // Recarregar tipos batidos para garantir sincronização
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

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Sistema de Ponto Eletrônico
        </h1>
        {unidade && <p className="text-lg text-gray-600 mt-1">{unidade}</p>}
        <div className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
          Conforme Portaria 671/2021 (REP-P)
        </div>
      </div>

      {/* Campo de CPF */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <User className="h-4 w-4" />
          Digite seu CPF:
        </label>
        <div className="relative">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cpf}
            onChange={e => {
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
              }
              // Verifica quando completa 11 dígitos
              if (limited.length === 11) {
                verifyCPF(formatted);
              }
            }}
            placeholder="000.000.000-00"
            maxLength={14}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              cpfError
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                : funcionario
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
          />
          {verificandoCpf && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
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
                  <div className="text-sm">{msg}</div>
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
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-green-900 text-base">
                    Funcionário Identificado
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                    <div className="text-xs text-green-600 font-medium mb-0.5">
                      Nome Completo
                    </div>
                    <div className="text-green-900 font-semibold text-base">
                      {funcionario.nome}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                      <div className="text-xs text-green-600 font-medium mb-0.5">
                        CPF
                      </div>
                      <div className="text-green-900 font-semibold">
                        {funcionario.cpf}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                      <div className="text-xs text-green-600 font-medium mb-0.5">
                        Unidade
                      </div>
                      <div className="text-green-900 font-semibold text-xs">
                        {funcionario.unidade}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-700 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
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

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <ClipboardList className="h-4 w-4" />
          Tipo de marcação:
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              // Validar ANTES de iniciar
              if (tiposBatidos.includes('ENTRADA')) {
                setMsg('Você já registrou Entrada hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('ENTRADA');
              await submit('ENTRADA');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('ENTRADA') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('ENTRADA')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Building
              className={`h-6 w-6 ${tiposBatidos.includes('ENTRADA') ? 'text-gray-400' : 'text-blue-600'}`}
            />
            <span className="font-semibold text-sm">Entrada</span>
            {tiposBatidos.includes('ENTRADA') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              // Validar ANTES de iniciar
              if (tiposBatidos.includes('SAIDA')) {
                setMsg('Você já registrou Saída hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('SAIDA');
              await submit('SAIDA');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('SAIDA') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('SAIDA')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <DoorOpen
              className={`h-6 w-6 ${tiposBatidos.includes('SAIDA') ? 'text-gray-400' : 'text-red-600'}`}
            />
            <span className="font-semibold text-sm">Saída</span>
            {tiposBatidos.includes('SAIDA') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              // Validar ANTES de iniciar
              if (tiposBatidos.includes('INTERVALO_INICIO')) {
                setMsg('Você já registrou Intervalo - Início hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('INTERVALO_INICIO');
              await submit('INTERVALO_INICIO');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('INTERVALO_INICIO') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('INTERVALO_INICIO')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Coffee
              className={`h-6 w-6 ${tiposBatidos.includes('INTERVALO_INICIO') ? 'text-gray-400' : 'text-orange-600'}`}
            />
            <span className="font-semibold text-sm">Intervalo - Início</span>
            {tiposBatidos.includes('INTERVALO_INICIO') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              // Validar ANTES de iniciar
              if (tiposBatidos.includes('INTERVALO_FIM')) {
                setMsg('Você já registrou Intervalo - Término hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('INTERVALO_FIM');
              await submit('INTERVALO_FIM');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('INTERVALO_FIM') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('INTERVALO_FIM')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Clock
              className={`h-6 w-6 ${tiposBatidos.includes('INTERVALO_FIM') ? 'text-gray-400' : 'text-green-600'}`}
            />
            <span className="font-semibold text-sm">Intervalo - Término</span>
            {tiposBatidos.includes('INTERVALO_FIM') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (tiposBatidos.includes('HORA_EXTRA_INICIO')) {
                setMsg('Você já registrou Hora Extra - Início hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('HORA_EXTRA_INICIO');
              await submit('HORA_EXTRA_INICIO');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('HORA_EXTRA_INICIO') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('HORA_EXTRA_INICIO')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Zap
              className={`h-6 w-6 ${tiposBatidos.includes('HORA_EXTRA_INICIO') ? 'text-gray-400' : 'text-purple-600'}`}
            />
            <span className="font-semibold text-sm">Hora Extra - Início</span>
            {tiposBatidos.includes('HORA_EXTRA_INICIO') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (tiposBatidos.includes('HORA_EXTRA_FIM')) {
                setMsg('Você já registrou Hora Extra - Saída hoje.');
                setMsgType('warning');
                return;
              }
              if (!funcionario) {
                setMsg(' Por favor, informe seu CPF primeiro.');
                setMsgType('warning');
                return;
              }
              setTipo('HORA_EXTRA_FIM');
              await submit('HORA_EXTRA_FIM');
            }}
            disabled={
              loading ||
              !funcionario ||
              tiposBatidos.includes('HORA_EXTRA_FIM') ||
              verificandoTipos
            }
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              tiposBatidos.includes('HORA_EXTRA_FIM')
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Zap
              className={`h-6 w-6 ${tiposBatidos.includes('HORA_EXTRA_FIM') ? 'text-gray-400' : 'text-indigo-600'}`}
            />
            <span className="font-semibold text-sm">Hora Extra - Saída</span>
            {tiposBatidos.includes('HORA_EXTRA_FIM') && (
              <span className="text-xs text-gray-500">Já registrado</span>
            )}
          </button>
        </div>
        {verificandoTipos && (
          <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando registros de hoje...
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Camera className="h-4 w-4" />
          Selfie obrigatória para validação:
        </div>
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }} // Espelha a câmera como selfie
          />
          <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Câmera frontal ativa
          </div>
        </div>
        <p className="text-xs text-gray-600">
          A foto será capturada automaticamente ao confirmar o ponto
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
              <h3 className="font-semibold text-blue-900 text-sm mb-2">
                Conformidade Legal
              </h3>
              <div className="space-y-2 text-xs text-blue-800">
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
          <div className="text-xs text-green-800">
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

      {/* Mensagens gerais (sucesso, warning, info, outros erros) - aparecem no final */}
      {msg &&
        !(
          msgType === 'error' &&
          (msg.includes('local cadastrado') ||
            msg.includes('fora da área') ||
            msg.includes('localização'))
        ) && (
          <div
            className={`text-sm p-4 rounded-lg ${
              msgType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : msgType === 'warning'
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : msgType === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-2">
              {msgType === 'success' && (
                <>
                  <Check className="h-4 w-4" />
                  Sucesso!
                </>
              )}
              {msgType === 'warning' && (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Atenção
                </>
              )}
              {msgType === 'error' && (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Erro
                </>
              )}
              {msgType === 'info' && (
                <>
                  <Info className="h-4 w-4" />
                  Informação
                </>
              )}
            </div>
            <div className="whitespace-pre-line">{msg}</div>
            {msgType === 'warning' && msg.includes('não encontrado') && (
              <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                <div className="text-sm text-yellow-800">
                  <strong className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Entre em contato com seu supervisor:
                  </strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Verifique se você está cadastrado nesta unidade</li>
                    <li>• Confirme se seu CPF está correto no sistema</li>
                    <li>• Solicite o cadastro na unidade se necessário</li>
                  </ul>
                </div>
              </div>
            )}
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

                <div className="space-y-2">
                  <p className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Sua foto será usada para comprovar sua presença
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Sua localização será registrada para segurança
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Seus horários serão guardados conforme a lei
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Você pode ver seus registros quando quiser
                  </p>
                </div>
              </div>

              {/* Preview da selfie que será usada como assinatura */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2 text-center">
                  Sua foto abaixo será usada como comprovação:
                </p>
                <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden border-2 border-blue-400">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Importante:</strong> Ao clicar em &quot;OK,
                  ENTENDI&quot;, você confirma que leu e concorda. Sua foto será
                  registrada como prova da sua assinatura.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const sucesso = await assinarTermo();
                    if (sucesso) {
                      // Fechar modal e permitir bater ponto
                      setMostrarTermo(false);
                      // Chamar submit após estado atualizar
                      setTimeout(() => {
                        // Criar nova função para não ter recursão
                        const baterPonto = async () => {
                          if (!code || !funcionario) return;
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

                            const pos =
                              await new Promise<GeolocationPosition | null>(
                                (resolve, reject) => {
                                  navigator.geolocation.getCurrentPosition(
                                    p => resolve(p),
                                    error => {
                                      let errorMsg = 'Erro ao capturar GPS: ';
                                      switch (error.code) {
                                        case error.PERMISSION_DENIED:
                                          errorMsg +=
                                            'Permissão de localização negada.';
                                          break;
                                        case error.POSITION_UNAVAILABLE:
                                          errorMsg +=
                                            'Localização indisponível.';
                                          break;
                                        case error.TIMEOUT:
                                          errorMsg +=
                                            'Tempo esgotado. Tente novamente.';
                                          break;
                                        default:
                                          errorMsg += 'Erro desconhecido.';
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
                                'Não foi possível capturar sua localização.'
                              );
                              setMsgType('error');
                              setLoading(false);
                              return;
                            }

                            const accuracy = pos.coords.accuracy || 0;
                            const selfie = await captureSelfie();
                            const fd = new FormData();
                            fd.append('code', code);
                            fd.append('tipo', tipo);
                            fd.append('cpf', cpf.replace(/\D/g, ''));
                            fd.append('lat', String(pos.coords.latitude));
                            fd.append('lng', String(pos.coords.longitude));
                            fd.append('accuracy', String(Math.round(accuracy)));

                            if (selfie)
                              fd.append('selfie', selfie, 'selfie.jpg');
                            fd.append(
                              'deviceId',
                              (localStorage.getItem('deviceId') || '') as string
                            );

                            const r = await fetch('/api/ponto/bater', {
                              method: 'POST',
                              body: fd,
                            });
                            const j = await r.json();
                            if (!r.ok)
                              throw new Error(
                                j?.error || 'Erro ao bater ponto'
                              );
                            setMsg(
                              `Ponto registrado com sucesso na unidade ${j.unidade}`
                            );
                            setMsgType('success');

                            // Atualizar lista de tipos batidos
                            setTiposBatidos(prev => [...prev, tipo]);

                            // Recarregar tipos batidos para garantir sincronização
                            if (cpf) {
                              setTimeout(
                                () => verificarTiposBatidos(cpf),
                                1000
                              );
                            }
                          } catch (e: any) {
                            setMsg(
                              `${e?.message || 'Falha ao registrar ponto'}`
                            );
                            setMsgType('error');
                          } finally {
                            setLoading(false);
                          }
                        };
                        baterPonto();
                      }, 200);
                    } else {
                      setMsg('Erro ao registrar termo. Tente novamente.');
                      setMsgType('error');
                      setMostrarTermo(false);
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  OK, ENTENDI
                </button>
                <button
                  onClick={() => setMostrarTermo(false)}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
