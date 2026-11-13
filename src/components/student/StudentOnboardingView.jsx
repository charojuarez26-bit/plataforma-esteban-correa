import React, { useState, useRef, useEffect } from 'react';
import BrandLogo, { MotivationalSlogan } from '../common/BrandLogo';
import { supabase } from '../../lib/supabaseClient';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import { 
  Camera, 
  UploadCloud, 
  X, 
  RefreshCw, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  LogOut,
  Target,
  KeyRound,
  Activity,
  HeartPulse,
  ShieldCheck
} from 'lucide-react';

const OBJETIVOS_LISTA = [
  'Reducir % de grasa y ganar fuerza',
  'Hipertrofia muscular y volumen limpio',
  'Fuerza máxima y potencia deportiva',
  'Recomposición corporal y definición',
  'Acondicionamiento físico general'
];

const LESIONES_COMUNES = [
  'Hombro / Manguito rotador',
  'Rodilla (meniscos / ligamentos)',
  'Columna Lumbar / Ciática',
  'Cervical / Cuello',
  'Muñeca / Codo',
  'Tobillo',
  'Ninguna lesión previa'
];

export default function StudentOnboardingView({ 
  student = null, 
  initialCode = '',
  onComplete, 
  onLogout,
  onBackToLogin 
}) {
  // Pasos:
  // 0: Pantalla de Acceso por Código (PIN de 4 dígitos)
  // 1: Wizard Paso 1 - Datos Personales y Antropometría
  // 2: Wizard Paso 2 - Ficha Médica y Antecedentes
  const [step, setStep] = useState(() => {
    if (student?.id || (initialCode && initialCode.length >= 4)) return 1;
    return 0;
  });

  // Estado del PIN de 4 dígitos
  const [pinDigits, setPinDigits] = useState(() => {
    if (initialCode && initialCode.length >= 4) {
      return initialCode.slice(0, 4).split('');
    }
    return ['', '', '', ''];
  });
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const pinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Coach y Cliente resueltos
  const [resolvedCoachId, setResolvedCoachId] = useState(student?.coach_id || '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86');
  const [resolvedCoachName, setResolvedCoachName] = useState('Esteban Correa');
  const [resolvedClientId, setResolvedClientId] = useState(student?.id || '');

  // Paso 1: Datos Personales
  const [formData, setFormData] = useState({
    nombre_completo: student?.nombre_completo || '',
    telefono: student?.telefono || '',
    edad: student?.edad ? String(student?.edad) : '',
    altura: student?.altura ? String(student?.altura) : '',
    peso_actual: student?.peso_actual ? String(student?.peso_actual) : '',
    objetivo: student?.objetivo || 'Reducir % de grasa y ganar fuerza',
    foto_url: student?.foto_url || student?.avatar_url || null,
    // Paso 2: Ficha Médica
    lesionesSeleccionadas: [],
    observacionesMedicas: '',
    restricciones: '',
    declaracionJurada: true
  });

  // Estado de foto de perfil
  const [photoPreview, setPhotoPreview] = useState(student?.foto_url || student?.avatar_url || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState('');
  const fileInputGalleryRef = useRef(null);
  const fileInputCameraRef = useRef(null);

  // Errores de validación y carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState('');

  // Si se pasa student o initialCode por prop
  useEffect(() => {
    if (student) {
      setFormData(prev => ({
        ...prev,
        nombre_completo: student.nombre_completo || prev.nombre_completo,
        telefono: student.telefono || prev.telefono,
        edad: student.edad ? String(student.edad) : prev.edad,
        altura: student.altura ? String(student.altura) : prev.altura,
        peso_actual: student.peso_actual ? String(student.peso_actual) : prev.peso_actual,
        objetivo: student.objetivo || prev.objetivo,
        foto_url: student.foto_url || student.avatar_url || prev.foto_url
      }));
      if (student.foto_url || student.avatar_url) {
        setPhotoPreview(student.foto_url || student.avatar_url);
      }
      if (student.coach_id) setResolvedCoachId(student.coach_id);
      if (student.id) setResolvedClientId(student.id);
      setStep(1);
    } else if (initialCode && initialCode.length >= 4) {
      setPinDigits(initialCode.slice(0, 4).split(''));
      handleVerify4DigitPin(initialCode.slice(0, 4));
    }
  }, [student, initialCode]);

  // =========================================================================
  // GESTIÓN DEL INPUT DE 4 DÍGITOS (PIN)
  // =========================================================================
  const handlePinDigitChange = (index, value) => {
    setPinError('');
    const cleanValue = value.replace(/[^0-9]/g, '');

    const newPin = [...pinDigits];
    newPin[index] = cleanValue.slice(-1); // toma el último dígito ingresado
    setPinDigits(newPin);

    // Auto-avance al siguiente input
    if (cleanValue && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    // Si se completaron los 4 dígitos, verificar automáticamente
    const fullPin = newPin.join('');
    if (fullPin.length === 4) {
      handleVerify4DigitPin(fullPin);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pastedData) return;

    const newPin = ['', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPinDigits(newPin);

    if (pastedData.length === 4) {
      pinInputRefs[3].current?.focus();
      handleVerify4DigitPin(pastedData);
    } else {
      pinInputRefs[pastedData.length]?.current?.focus();
    }
  };

  // =========================================================================
  // VERIFICACIÓN DEL CÓDIGO DE 4 DÍGITOS (INVITACIÓN DEL ENTRENADOR)
  // =========================================================================
  const handleVerify4DigitPin = async (rawCode = null) => {
    setPinError('');
    const code = (rawCode || pinDigits.join('')).trim();

    if (code.length < 4) {
      setPinError('Introduce los 4 dígitos numéricos provistos por tu entrenador.');
      return;
    }

    setIsVerifyingPin(true);
    try {
      // Verificar código de invitación del entrenador (NUNCA loguear a un alumno existente)
      const verified = await authService.verifyCoachInvitationCode(code);

      if (verified?.coachId) {
        setResolvedCoachId(verified.coachId);
      }
      if (verified?.coachName) {
        setResolvedCoachName(verified.coachName);
      }
      setResolvedClientId(null); // Asegura que siempre sea un registro nuevo

      // Avanzar al Asistente Paso 1 (Datos Personales)
      setStep(1);
    } catch (err) {
      console.error('[Onboarding PIN] Error:', err);
      setPinError(err.message || 'Código de invitación no reconocido. Consúltalo con Esteban Correa por WhatsApp.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // =========================================================================
  // SUBIDA AUTOMÁTICA DE FOTO A STORAGE
  // =========================================================================
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError('');
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    setIsUploadingPhoto(true);
    try {
      let uploadedUrl = null;
      try {
        uploadedUrl = await dataService.uploadClientAvatar(file);
      } catch (uploadErr) {
        console.warn('[Onboarding] Subida directa fallback:', uploadErr);
        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (upErr) throw upErr;
        const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(upData?.path || fileName);
        uploadedUrl = pubData?.publicUrl || null;
      }

      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, foto_url: uploadedUrl }));
        setPhotoPreview(uploadedUrl);
      } else {
        setFormData(prev => ({ ...prev, foto_url: localUrl }));
      }
    } catch (err) {
      console.error('[Onboarding] Error subiendo foto:', err);
      setPhotoUploadError('No se pudo subir la foto a la nube, se guardará temporalmente.');
      setFormData(prev => ({ ...prev, foto_url: localUrl }));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, foto_url: null }));
    if (fileInputGalleryRef.current) fileInputGalleryRef.current.value = '';
    if (fileInputCameraRef.current) fileInputCameraRef.current.value = '';
  };

  // =========================================================================
  // NAVEGACIÓN ENTRE PASOS DEL ASISTENTE WIZARD
  // =========================================================================
  const handleAdvanceToStep2 = (e) => {
    e.preventDefault();
    setStepError('');

    if (!formData.nombre_completo.trim()) {
      setStepError('El Nombre Completo es obligatorio.');
      return;
    }
    if (!formData.telefono.trim()) {
      setStepError('El WhatsApp / Teléfono es obligatorio para la comunicación con tu entrenador.');
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleLesion = (lesion) => {
    setFormData(prev => {
      let current = [...prev.lesionesSeleccionadas];
      if (lesion === 'Ninguna lesión previa') {
        return { ...prev, lesionesSeleccionadas: current.includes(lesion) ? [] : ['Ninguna lesión previa'] };
      }
      current = current.filter(l => l !== 'Ninguna lesión previa');
      if (current.includes(lesion)) {
        current = current.filter(l => l !== lesion);
      } else {
        current.push(lesion);
      }
      return { ...prev, lesionesSeleccionadas: current };
    });
  };

  // =========================================================================
  // GUARDADO FINAL EN SUPABASE (CLIENTS + MEDICAL_RECORDS)
  // =========================================================================
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setStepError('');

    if (!formData.declaracionJurada) {
      setStepError('Debes aceptar la declaración de conformidad para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const coachId = resolvedCoachId || student?.coach_id || '7e2d4c88-8e3e-4ef6-bcbb-7fc46e582d86';
      const cleanNombre = formData.nombre_completo.trim();
      const cleanTelefono = formData.telefono.trim();

      // Validar si existe un ID previo que sea un UUID válido estricto (solo si viene de la prop student)
      const isValidUUID = (val) => {
        return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      };

      const existingUUID = (student?.id && isValidUUID(student.id)) ? student.id : null;

      // Código de acceso nuevo y único garantizado (ej: 'EC-8492' o 'JP-4129')
      let accessCode = student?.access_code;
      if (!accessCode) {
        const initials = cleanNombre
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'EC';

        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 25) {
          attempts++;
          const randomDigits = Math.floor(1000 + Math.random() * 9000);
          const candidateCode = `${initials}-${randomDigits}`;

          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('access_code', candidateCode)
            .maybeSingle();

          if (!existing) {
            accessCode = candidateCode;
            isUnique = true;
          }
        }

        if (!accessCode) {
          accessCode = `${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      const pesoNumerico = formData.peso_actual ? parseFloat(formData.peso_actual) : null;

      // 1. Guardar en la tabla 'clients'
      // NOTA: NO enviamos 'id' manual para que Supabase genere automáticamente el UUID con gen_random_uuid()
      const clientPayload = {
        coach_id: coachId,
        nombre_completo: cleanNombre,
        telefono: cleanTelefono,
        edad: formData.edad ? parseInt(formData.edad, 10) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        peso_inicial: pesoNumerico,
        peso_actual: pesoNumerico,
        objetivo: (formData.objetivo || 'Reducir % de grasa y ganar fuerza').trim(),
        modalidad: 'Presencial',
        access_code: accessCode,
        estado: 'Activo',
        foto_url: formData.foto_url || null,
        avatar_url: formData.foto_url || null,
        onboarding_completado: true,
        estado_pago: 'vencido',
        fecha_vencimiento: null
      };

      let savedClient = null;
      let clientErr = null;

      if (existingUUID) {
        // Actualización de registro existente con UUID válido
        const res = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', existingUUID)
          .select()
          .single();
        savedClient = res.data;
        clientErr = res.error;
      } else {
        // Alta de nuevo alumno: Supabase genera el UUID automáticamente
        const res = await supabase
          .from('clients')
          .insert([clientPayload])
          .select()
          .single();
        savedClient = res.data;
        clientErr = res.error;
      }

      // Fallback si la columna onboarding_completado no existe en Postgres
      if (clientErr && clientErr.code === '42703') {
        const fallbackPayload = { ...clientPayload };
        delete fallbackPayload.onboarding_completado;
        if (existingUUID) {
          const retry = await supabase
            .from('clients')
            .update(fallbackPayload)
            .eq('id', existingUUID)
            .select()
            .single();
          savedClient = retry.data;
          clientErr = retry.error;
        } else {
          const retry = await supabase
            .from('clients')
            .insert([fallbackPayload])
            .select()
            .single();
          savedClient = retry.data;
          clientErr = retry.error;
        }
      }

      if (clientErr) {
        console.error('[Onboarding] Error al guardar en clients:', clientErr);
        throw new Error('Error al registrar alumno en Supabase: ' + clientErr.message);
      }

      if (!savedClient || !savedClient.id) {
        throw new Error('No se pudo obtener el identificador generado por Supabase.');
      }

      const clientId = savedClient.id;

      const finalStudent = {
        ...savedClient,
        nombre: cleanNombre,
        onboarding_completado: true
      };

      // 2. Guardar en la tabla 'medical_records'
      try {
        const detallePartes = [];
        if (formData.observacionesMedicas.trim()) {
          detallePartes.push(`Antecedentes/Lesiones: ${formData.observacionesMedicas.trim()}`);
        }
        if (formData.restricciones.trim()) {
          detallePartes.push(`Restricciones Médicas: ${formData.restricciones.trim()}`);
        }

        await supabase
          .from('medical_records')
          .upsert({
            client_id: clientId,
            lesiones: formData.lesionesSeleccionadas || [],
            detalle_lesiones: detallePartes.join('\n\n') || 'Sin observaciones registradas',
            completada: true,
            declaracion_jurada: true,
            actualizado_el: new Date().toISOString()
          }, { onConflict: 'client_id' });
      } catch (medErr) {
        console.warn('[Onboarding] Nota guardando medical_records:', medErr);
      }

      // 3. Persistir sesión local en active_student_id y alumno_session
      localStorage.setItem('active_student_id', finalStudent.id);
      localStorage.setItem('alumno_session', JSON.stringify(finalStudent));

      const studentSession = {
        role: 'student',
        user: finalStudent,
        token: `student-session-${finalStudent.id}`,
        loggedAt: new Date().toISOString()
      };
      authService.saveSession(studentSession);

      // Guardar metadatos locales
      try {
        localStorage.setItem(`ec_client_meta_${clientId}`, JSON.stringify({
          foto_url: formData.foto_url,
          avatar_url: formData.foto_url,
          peso_actual: formData.peso_actual,
          lesiones: formData.lesionesSeleccionadas,
          onboarding_completado: true
        }));
      } catch { /* ignore */ }

      // 4. Redirigir al dashboard principal del alumno
      if (onComplete) {
        onComplete(finalStudent);
      }
    } catch (err) {
      console.error('[Onboarding] Excepción en guardado final:', err);
      setStepError(err.message || 'Error al persistir la información en Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 pb-10 relative overflow-x-hidden">
      {/* Luces y brillo ambiental */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-brand opacity-15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-brand-dark opacity-10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Inputs ocultos para subida de fotos y cámara */}
      <input
        type="file"
        ref={fileInputGalleryRef}
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handlePhotoFileChange}
      />
      <input
        type="file"
        ref={fileInputCameraRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {/* Header con Marca */}
      <header className="w-full max-w-lg flex justify-between items-center py-4 z-10">
        <BrandLogo size="md" />

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        )}
      </header>

      {/* Tarjeta Principal de Onboarding */}
      <div className="w-full max-w-lg bg-dark-850 border border-dark-700/80 rounded-2xl shadow-2xl p-5 sm:p-7 z-10 my-4">

        {/* ======================================================== */}
        {/* PASO 0: PANTALLA DE ACCESO POR CÓDIGO (PIN DE 4 DÍGITOS) */}
        {/* ======================================================== */}
        {step === 0 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/30 text-brand-light flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Acceso con Código</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                Introduce el código numérico de 4 dígitos provisto por tu entrenador para activar tu cuenta.
              </p>
            </div>

            {pinError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-shake shadow-md">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span className="font-semibold leading-tight">{pinError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleVerify4DigitPin(); }} className="space-y-6">
              
              {/* Casillas de los 4 dígitos */}
              <div className="flex justify-center items-center gap-3 sm:gap-4 my-4" onPaste={handlePinPaste}>
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinInputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => handlePinDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-black text-brand-light bg-dark-900 border border-dark-700 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none transition-all shadow-inner"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isVerifyingPin || pinDigits.some(d => !d)}
                className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-glow-red hover:shadow-brand/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-40 min-h-[48px] text-sm"
              >
                {isVerifyingPin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando código...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar y Configurar Perfil</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {onBackToLogin && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    ← Volver a opciones de ingreso
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* BARRA DE PROGRESO DE LOS 2 PASOS (WIZARD)               */}
        {/* ======================================================== */}
        {step > 0 && (
          <div className="mb-5 pb-3 border-b border-dark-700/80">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-2">
              <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-brand-light font-bold' : 'text-gray-300'}`}>
                {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-4 h-4 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">1</span>}
                <span>Paso 1: Datos Personales</span>
              </span>
              <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-brand-light font-bold' : 'text-gray-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-brand text-white' : 'bg-dark-800 text-gray-400 border border-dark-700'}`}>2</span>
                <span>Paso 2: Ficha Médica</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-dark-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand to-brand-light transition-all duration-300"
                style={{ width: step === 1 ? '50%' : '100%' }}
              ></div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ASISTENTE PASO 1: DATOS PERSONALES & ANTROPOMETRÍA       */}
        {/* ======================================================== */}
        {step === 1 && (
          <div>
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-light" />
                <span>Datos Personales y Antropometría</span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Ingresa tus datos base para vincularte con {resolvedCoachName}.
              </p>
            </div>

            {stepError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{stepError}</span>
              </div>
            )}

            {photoUploadError && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{photoUploadError}</span>
              </div>
            )}

            <form onSubmit={handleAdvanceToStep2} className="space-y-4">
              
              {/* Sección Foto de Perfil Central */}
              <div className="py-2 flex flex-col items-center justify-center text-center">
                {photoPreview ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative group">
                      <img
                        src={photoPreview}
                        alt="Foto de perfil"
                        className="w-20 h-20 rounded-full object-cover border-2 border-brand shadow-glow-red/30 transition-transform group-hover:scale-105"
                      />
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-brand animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                        title="Quitar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => fileInputGalleryRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-zinc-300 hover:text-white border border-dark-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-brand" />
                        <span>Cambiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputCameraRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-zinc-300 hover:text-white border border-dark-700 text-[11px] font-semibold transition-colors flex items-center gap-1 sm:hidden"
                      >
                        <Camera className="w-3 h-3 text-brand" />
                        <span>Cámara</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-2 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 text-[11px] font-semibold transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2.5">
                    <div
                      onClick={() => fileInputGalleryRef.current?.click()}
                      className="w-20 h-20 rounded-full border-2 border-dashed border-brand hover:border-brand-light bg-brand/10 hover:bg-brand/15 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-inner shadow-brand/10"
                    >
                      <Camera className="w-7 h-7 text-brand group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-extrabold text-brand-light mt-0.5 uppercase tracking-tight">
                        Foto
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputGalleryRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:border-brand/40 min-h-[38px]"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-brand" />
                        <span>Subir Archivo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputCameraRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-brand/15 hover:bg-brand/25 border border-brand/40 text-xs font-bold text-brand-light transition-all flex items-center gap-1.5 shadow-sm min-h-[38px]"
                      >
                        <Camera className="w-3.5 h-3.5 text-brand" />
                        <span>Tomar Foto</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Ramírez"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                />
              </div>

              {/* WhatsApp / Teléfono */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                  WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+54 9 11 4433-2211"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                />
              </div>

              {/* Antropometría: Edad, Altura y Peso Inicial */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Edad
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="100"
                    placeholder="26"
                    value={formData.edad}
                    onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    placeholder="168"
                    value={formData.altura}
                    onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                    Peso Inicial <span className="text-gray-500 font-normal">(kg)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      placeholder="Ej: 75.5"
                      value={formData.peso_actual}
                      onChange={(e) => setFormData({ ...formData, peso_actual: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 pr-9 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Objetivo Principal */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                  Objetivo Principal *
                </label>
                <div className="relative">
                  <select
                    value={formData.objetivo}
                    onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-brand min-h-[44px] appearance-none"
                  >
                    {OBJETIVOS_LISTA.map((obj) => (
                      <option key={obj} value={obj}>
                        {obj}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Target className="w-4 h-4 text-brand" />
                  </div>
                </div>
              </div>

              {/* Botón para avanzar al Paso 2 */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={isUploadingPhoto}
                  className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-glow-red hover:shadow-brand/50 transition-all flex items-center justify-center gap-2 group min-h-[48px] text-sm"
                >
                  <span>Continuar a Ficha Médica</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                {onBackToLogin && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={onBackToLogin}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      ← Volver a opciones de ingreso
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* ASISTENTE PASO 2: FICHA MÉDICA & ANTECEDENTES            */}
        {/* ======================================================== */}
        {step === 2 && (
          <div>
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-400" />
                <span>Ficha Médica & Antecedentes</span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Registra cualquier lesión o restricción para que tu entrenador adapte los ejercicios a tu biomecánica.
              </p>
            </div>

            {stepError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{stepError}</span>
              </div>
            )}

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              
              {/* Selector de lesiones comunes */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1.5">
                  ¿Tienes molestias o lesiones previas en alguna zona?
                </label>
                <div className="flex flex-wrap gap-2">
                  {LESIONES_COMUNES.map((lesion) => {
                    const isSelected = formData.lesionesSeleccionadas.includes(lesion);
                    return (
                      <button
                        key={lesion}
                        type="button"
                        onClick={() => handleToggleLesion(lesion)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-red-500/20 text-red-300 border-red-500/60 shadow-sm'
                            : 'bg-dark-900 text-gray-400 border-dark-700 hover:text-white hover:border-dark-600'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {lesion}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle de lesiones y cirugías */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                  Lesiones, dolencias o cirugías previas
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Operación de rodilla en 2022, molestia en hombro izquierdo en press de banca..."
                  value={formData.observacionesMedicas}
                  onChange={(e) => setFormData({ ...formData, observacionesMedicas: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand resize-none"
                />
              </div>

              {/* Restricciones médicas */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-300 mb-1">
                  Restricciones físicas o indicaciones médicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Ejercicios contraindicados por traumatólogo, medicación, asma, etc."
                  value={formData.restricciones}
                  onChange={(e) => setFormData({ ...formData, restricciones: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand resize-none"
                />
              </div>

              {/* Declaración Jurada */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-900/80 border border-dark-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.declaracionJurada}
                    onChange={(e) => setFormData({ ...formData, declaracionJurada: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-700 text-brand focus:ring-brand mt-0.5 shrink-0"
                  />
                  <span className="text-[11px] text-gray-300 leading-snug">
                    Declaro bajo juramento que los datos provistos son verídicos y que me encuentro en condiciones físicas para realizar actividad de musculación bajo la guía de mi entrenador.
                  </span>
                </label>
              </div>

              {/* Botones de Navegación del Paso 2 */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3.5 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white font-bold text-xs sm:text-sm border border-dark-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3.5 px-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl shadow-glow-red hover:shadow-brand/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 min-h-[48px] text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando ficha...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar y Entrenar</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* Footer Branding Deportivo */}
      <footer className="w-full max-w-lg text-center py-2 z-10">
        <p className="text-[11px] tracking-[0.2em] font-extrabold text-gray-400 uppercase select-none">
          ESTEBAN CORREA • PERSONAL TRAINER
        </p>
      </footer>
    </div>
  );
}
