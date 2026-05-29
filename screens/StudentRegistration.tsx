import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { generateRegistrationDocument } from '../services/registrationService';

const StudentRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [fieldWarnings, setFieldWarnings] = useState<{ email?: string; document_number?: string }>({});

  // Form State
  const [formData, setFormData] = useState({
    // Account
    email: '',
    password: '',
    // Personal
    full_name: '',
    birth_date: '',
    age: '',
    phone: '',
    guardian_name: '',
    guardian_document: '',
    // Document
    document_type: 'C.C.',
    document_number: '',
    document_issue_date: '',
    document_issue_place: '',
    // Academic
    cohort: '',
  });

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'birth_date') {
      const age = calculateAge(value);
      setFormData(prev => ({ ...prev, [name]: value, age }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    // Block navigation if there are field warnings
    if (Object.values(fieldWarnings).some(w => w)) return;
    setStep(step + 1);
  };

  const checkEmailDuplicate = async (email: string) => {
    if (!email) return;
    const { data } = await supabase.from('profiles').select('id').ilike('email', email.trim()).maybeSingle();
    if (data) {
      setFieldWarnings(prev => ({ ...prev, email: `El correo ${email} ya está registrado.` }));
    } else {
      setFieldWarnings(prev => ({ ...prev, email: undefined }));
    }
  };

  const checkDocumentDuplicate = async (doc: string) => {
    if (!doc) return;
    const { data } = await supabase.from('profiles').select('id').eq('document_number', doc).maybeSingle();
    if (data) {
      setFieldWarnings(prev => ({ ...prev, document_number: `El documento ${doc} ya está registrado.` }));
    } else {
      setFieldWarnings(prev => ({ ...prev, document_number: undefined }));
    }
  };
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      // Auto-set password to document number

      // Auto-set password to document number
      const payload = {
        ...formData,
        password: formData.document_number
      };

      const { data: { session } } = await supabase.auth.getSession();

      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: responseText };
      }

      if (!response.ok) {
        throw new Error(data.error || `Error del servidor: ${response.status} ${response.statusText}`);
      }

      setMsg({ type: 'success', text: '¡Estudiante inscrito exitosamente! Generando contrato...' });

      // Generate registration PDF
      await generateRegistrationDocument({
        fullName: formData.full_name,
        documentType: formData.document_type,
        documentNumber: formData.document_number,
        documentIssueDate: formData.document_issue_date,
        documentIssuePlace: formData.document_issue_place,
        birthDate: formData.birth_date,
        age: formData.age,
        guardianName: Number(formData.age) < 18 ? formData.guardian_name : undefined,
        guardianDocument: Number(formData.age) < 18 ? formData.guardian_document : undefined,
        email: formData.email,
        phone: formData.phone,
        cohort: formData.cohort
      });

      setTimeout(() => navigate('/admin'), 3000);

    } catch (error: any) {
      console.error('Registration error:', error);
      setMsg({ type: 'error', text: error.message || 'Error desconocido al crear usuario.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-900 min-h-screen">
      <header className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate('/admin')} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors dark:text-white">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold dark:text-white">Registro Administrativo</h1>
          <p className="text-[10px] font-bold text-nexus-blue uppercase tracking-widest">Nuevo Estudiante</p>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Steps Indicator */}
      <div className="flex px-8 py-4 gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${s <= step ? 'bg-nexus-blue shadow-sm shadow-blue-500/20' : 'bg-gray-100 dark:bg-slate-800'
              }`}
          ></div>
        ))}
      </div>

      <main className="flex-1 p-8 overflow-y-auto">
        <form onSubmit={handleSubmit} className="h-full flex flex-col pb-20 max-w-2xl mx-auto w-full">

          {msg && (
            <div className={`p-4 mb-6 rounded-xl text-center font-bold text-sm ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900">1. Credenciales y Contacto</h2>

              <div className="space-y-4">
                <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Correo Electrónico</label>
                <input required name="email" type="email" value={formData.email} onChange={handleChange}
                  onBlur={e => checkEmailDuplicate(e.target.value)}
                  className={`w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white ${fieldWarnings.email ? 'ring-2 ring-red-500' : ''}`} />
                {fieldWarnings.email && (
                  <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1 px-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {fieldWarnings.email}
                  </p>
                )}
              </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Contraseña Temporal</label>
                  <div className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-gray-400 italic">
                    Se asignará automáticamente el número de documento.
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Celular</label>
                  <input required name="phone" type="tel" value={formData.phone} onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900">2. Datos Personales</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Nombre Completo</label>
                  <input required name="full_name" type="text" value={formData.full_name} onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Fecha de Nacimiento</label>
                    <input required name="birth_date" type="date" value={formData.birth_date} onChange={handleChange}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Edad</label>
                    <input readOnly name="age" type="text" value={formData.age}
                      className="w-full bg-gray-100 dark:bg-slate-800/80 border-none rounded-xl p-4 text-sm dark:text-gray-400 font-bold text-center" />
                  </div>
                </div>

                {Number(formData.age) > 0 && Number(formData.age) < 18 && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                      <span className="material-symbols-outlined text-sm font-bold">family_restroom</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Información del Acudiente (Menor de Edad)</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Nombre Completo del Acudiente</label>
                      <input required name="guardian_name" type="text" value={formData.guardian_name} onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Número de Documento del Acudiente</label>
                      <input required name="guardian_document" type="text" value={formData.guardian_document} onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-4 text-sm dark:text-white mt-1" />
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Tipo Doc.</label>
                      <select name="document_type" value={formData.document_type} onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 text-sm dark:text-white appearance-none">
                        <option className="text-slate-900 bg-white">C.C.</option>
                        <option className="text-slate-900 bg-white">T.I.</option>
                        <option className="text-slate-900 bg-white">C.E.</option>
                        <option className="text-slate-900 bg-white">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Número</label>
                      <input required name="document_number" type="text" value={formData.document_number} onChange={handleChange}
                        onBlur={e => checkDocumentDuplicate(e.target.value)}
                        className={`w-full bg-white dark:bg-slate-800 rounded-xl p-3 text-sm dark:text-white ${fieldWarnings.document_number ? 'ring-2 ring-red-500' : ''}`} />
                      {fieldWarnings.document_number && (
                        <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1 px-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          {fieldWarnings.document_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Fecha Exp.</label>
                      <input required name="document_issue_date" type="date" value={formData.document_issue_date} onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 text-sm dark:text-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Lugar Exp.</label>
                      <input required name="document_issue_place" type="text" value={formData.document_issue_place} onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 text-sm dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900">3. Asignación Académica</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-nexus-blue uppercase tracking-widest px-1">Cohorte / Grupo</label>
                  <select required name="cohort" value={formData.cohort} onChange={handleChange}
                    className="w-full bg-blue-50 dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900 rounded-xl p-4 text-sm font-bold dark:text-white appearance-none">
                    <option value="" disabled className="text-slate-900 bg-white">Seleccionar cohorte...</option>
                    <option value="Enero" className="text-slate-900 bg-white">Enero</option>
                    <option value="Marzo" className="text-slate-900 bg-white">Marzo</option>
                    <option value="Junio" className="text-slate-900 bg-white">Junio</option>
                    <option value="Septiembre" className="text-slate-900 bg-white">Septiembre</option>
                    <option value="Diciembre" className="text-slate-900 bg-white">Diciembre</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2 px-1">
                    El estudiante será inscrito automáticamente en los cursos correspondientes a este grupo.
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                  <span className="material-symbols-outlined text-amber-500">warning</span>
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-bold">Importante</p>
                    <p>Al finalizar, se creará la cuenta y el estudiante podrá ingresar inmediatamente con las credenciales asignadas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-auto pt-8 flex gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-100 dark:border-slate-800 font-bold dark:text-white active:scale-95 transition-all"
              >
                Anterior
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={Object.values(fieldWarnings).some(w => w)}
                className="flex-[2] py-4 rounded-2xl bg-nexus-blue text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 rounded-2xl bg-nexus-green text-white font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Creando Estudiante...' : 'Confirmar Inscripción'}
                {!loading && <span className="material-symbols-outlined">check_circle</span>}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

export default StudentRegistration;
