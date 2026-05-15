'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, FormTopic, FormQuestion } from '@/lib/supabase'

type AnswerValue = string | string[] | File | null

interface FormAnswers {
  [questionId: string]: AnswerValue
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [dbUser, setDbUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)

  const [applicantEmail, setApplicantEmail] = useState('')
  const [isSelf, setIsSelf] = useState(false)
  const [emailValidated, setEmailValidated] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [topics, setTopics] = useState<FormTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<FormTopic | null>(null)

  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [answers, setAnswers] = useState<FormAnswers>({})

  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email && !dbUser && !userLoading) {
      loadDbUser(session.user.email)
    }
  }, [status, session?.user?.email, dbUser, userLoading])

  const loadDbUser = async (email: string) => {
    setUserLoading(true)
    const { data, error } = await supabase.from('users').select('*').eq('corpemail', email).single()
    if (error || !data) {
      setUserError('Tu cuenta no está registrada en el sistema. Contacta al administrador.')
    } else {
      setDbUser(data as User)
      await loadTopics(data as User)
    }
    setUserLoading(false)
  }

  const loadTopics = async (user: User) => {
    setTopicsLoading(true)
    const { data, error } = await supabase.from('formTopics').select('*').eq('active', true)
    
    if (error) console.error("Error cargando tópicos:", error)
    if (data) console.log("Tópicos recibidos de la DB:", data)

    if (!error && data) {
      const filtered = data.filter((t: FormTopic) => 
        user.coordinator === true || 
        t.access?.toLowerCase() === 'all'
      )
      console.log("Tópicos después del filtro:", filtered)
      setTopics(filtered)
    }
    setTopicsLoading(false)
  }

  const handleSelfToggle = () => {
    const newVal = !isSelf
    setIsSelf(newVal)
    if (newVal && session?.user?.email) {
      setApplicantEmail(session.user.email)
      validateApplicantEmail(session.user.email)
    } else {
      setApplicantEmail('')
      setEmailValidated(false)
      setEmailError(null)
    }
  }

  const validateApplicantEmail = async (email: string) => {
    if (!email) return
    setEmailValidating(true)
    setEmailError(null)
    setEmailValidated(false)
    const { data, error } = await supabase.from('users').select('id').eq('corpemail', email).single()
    if (error || !data) {
      setEmailError('Este correo no está registrado como usuario corporativo.')
      setEmailValidated(false)
    } else {
      setEmailValidated(true)
    }
    setEmailValidating(false)
  }

  const handleEmailBlur = () => {
    if (applicantEmail && !isSelf) validateApplicantEmail(applicantEmail)
  }

  const handleTopicChange = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId) || null
    setSelectedTopic(topic)
    setAnswers({})
    setQuestions([])
    setSubmitSuccess(false)
    setSubmitError(null)
    if (!topic) return
    setQuestionsLoading(true)

    // Intenta cargar usando pulseid. Si no funciona, verifica si tu DB usa el UUID (topic.id)
    console.log("Buscando preguntas para tópico:", topic.name, "con pulseid:", topic.pulseid)
    
    const { data, error } = await supabase
      .from('formQuestions')
      .select('*')
      .eq('topic_id', topic.pulseid) // Cambia a topic.id si usas UUIDs en formQuestions
      .order('order_index', { ascending: true })
    
    if (error) {
      console.error("Error Supabase formQuestions:", error)
      setSubmitError("Error al cargar las preguntas del tópico.")
    }
    if (data) {
      console.log("Preguntas encontradas:", data.length)
      setQuestions(data as FormQuestion[])
    }
    setQuestionsLoading(false)
  }

  const handleAnswerChange = (qId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValidated) { setSubmitError('Por favor valida el correo del solicitante.'); return }
    if (!selectedTopic) { setSubmitError('Por favor selecciona un tópico.'); return }
    setSubmitting(true)
    setSubmitError(null)
    const serializedAnswers: Record<string, string | string[]> = {}
    for (const [qId, val] of Object.entries(answers)) {
      if (val instanceof File) serializedAnswers[qId] = `[Archivo: ${val.name}]`
      else if (val !== null && val !== undefined) serializedAnswers[qId] = val as string | string[]
    }
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantEmail, topicId: selectedTopic.id, topicName: selectedTopic.name, topicPulseId: selectedTopic.pulseid, answers: serializedAnswers }),
      })
      const result = await res.json()
      if (!res.ok) setSubmitError(result.error || 'Error al enviar.')
      else { setSubmitSuccess(true); setAnswers({}); setSelectedTopic(null); setApplicantEmail(''); setIsSelf(false); setEmailValidated(false); setQuestions([]) }
    } catch { setSubmitError('Error de conexión. Intenta nuevamente.') }
    setSubmitting(false)
  }

  if (status === 'loading' || (userLoading && !dbUser)) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1115' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: '#94a3b8' }}>Cargando...</p>
      </div>
    </div>
  )

  if (userError) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f1115' }}>
      <div className="card p-8 max-w-md w-full text-center" style={{ background: '#1a1d23', border: '1px solid #2a2e37' }}>
        <div className="text-3xl mb-4">⚠️</div>
        <h2 className="font-display text-xl mb-2" style={{ color: '#f8f5ee' }}>Acceso No Autorizado</h2>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>{userError}</p>
        <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="btn-outline">Cerrar Sesión</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f1115', color: '#f8f5ee' }}>
      <header style={{ background: '#000', borderBottom: '2px solid var(--gold)' }}>
        <div className="max-w-2xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>⚖</span>
            <div>
              <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontWeight: 500 }}>Mangone Law Firm</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{session?.user?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="btn-outline text-xs" style={{ color: '#f8f5ee', borderColor: 'rgba(248,245,238,0.2)' }}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center mb-10 animate-fadeUp">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-16" style={{ background: 'var(--gold)' }} />
            <span style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.2em' }}>RRHH</span>
            <div className="h-px w-16" style={{ background: 'var(--gold)' }} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-light">Solicitudes a Recursos Humanos</h1>
          <p className="mt-2 text-sm tracking-wide" style={{ color: 'var(--gold-dark)' }}>Mangone Law Firm · Portal Interno</p>
        </div>

        {submitSuccess && (
          <div className="animate-fadeUp mb-6 p-4 rounded-sm flex items-start gap-3" style={{ background: 'rgba(26, 107, 60, 0.1)', border: '1px solid #1A6B3C', color: '#A8D5BE' }}>
            <span>✓</span>
            <div>
              <p className="font-medium text-sm">Solicitud enviada exitosamente</p>
              <p className="text-xs mt-1 opacity-75">Tu solicitud ha sido registrada y será procesada pronto.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="animate-fadeUp card p-8" style={{ background: '#1a1d23', border: '1px solid #2a2e37' }}>
          {/* SECTION 1: Solicitante */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--charcoal)', color: 'var(--gold)' }}>1</div>
              <h2 className="font-display text-xl font-medium text-white">Datos del Solicitante</h2>
            </div>
            <div className="h-px mb-5" style={{ background: '#2a2e37' }} />

            <div className="max-w-md mx-auto">
            <label className="flex items-center gap-3 mb-6 cursor-pointer" onClick={handleSelfToggle}>
              <div className="w-4 h-4 flex-shrink-0 rounded-sm flex items-center justify-center transition-all"
                style={{ border: `1.5px solid ${isSelf ? 'var(--gold)' : '#3f444d'}`, background: isSelf ? 'var(--gold)' : 'transparent' }}>
                {isSelf && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm" style={{ color: '#e2e8f0' }}>Soy el solicitante — usar mi correo corporativo</span>
            </label>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Correo del Solicitante *</label>
              <div className="relative">
                <input type="email" value={applicantEmail}
                  onChange={e => { setApplicantEmail(e.target.value); setEmailValidated(false); setEmailError(null) }}
                  onBlur={handleEmailBlur} disabled={isSelf}
                  placeholder="correo@mangone.com" className="form-input pr-10" required 
                  style={{ background: '#0f1115', borderColor: '#3f444d', color: 'white' }} />
                {emailValidating && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />}
                {emailValidated && !emailValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#4ade80' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
              {emailError && <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{emailError}</p>}
              {emailValidated && <p className="mt-1.5 text-xs" style={{ color: '#4ade80' }}>✓ Correo verificado en el sistema</p>}
            </div>
            </div>
          </div>

          {/* SECTION 2: Tópico */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--charcoal)', color: 'var(--gold)' }}>2</div>
              <h2 className="font-display text-xl font-medium text-white">Tipo de Solicitud</h2>
            </div>
            <div className="h-px mb-5" style={{ background: '#2a2e37' }} />
            <div className="max-w-md mx-auto">
              <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Selecciona el Tópico *</label>
              <select value={selectedTopic?.id || ''} onChange={e => handleTopicChange(e.target.value)}
                disabled={topicsLoading} className="form-input form-select" required
                style={{ background: '#0f1115', borderColor: '#3f444d', color: 'white' }}>
                <option value="">{topicsLoading ? 'Cargando tópicos...' : '— Selecciona una opción —'}</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {selectedTopic?.description && <p className="mt-2 text-xs italic" style={{ color: '#94a3b8' }}>{selectedTopic.description}</p>}
            </div>
          </div>

          {/* SECTION 3: Preguntas */}
          {selectedTopic && (
            <div className="mb-10 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--charcoal)', color: 'var(--gold)' }}>3</div>
                <h2 className="font-display text-xl font-medium text-white">Detalles de la Solicitud</h2>
              </div>
              <div className="h-px mb-5" style={{ background: '#2a2e37' }} />
              {questionsLoading ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                  <span className="text-sm" style={{ color: '#94a3b8' }}>Cargando preguntas...</span>
                </div>
              ) : (
                <>
                  {questions.length > 0 ? (
                    <div className="space-y-6 max-w-md mx-auto">
                      {questions.map((q, idx) => (
                        <QuestionField key={q.id || idx} question={q}
                          value={answers[q.subitempulse] ?? null}
                          onChange={val => handleAnswerChange(q.subitempulse, val)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-xs italic" style={{ color: '#94a3b8' }}>No hay preguntas configuradas para este tópico.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Submit */}
          {selectedTopic && !questionsLoading && (
            <div className="pt-6 border-t max-w-md mx-auto" style={{ borderColor: '#2a2e37' }}>
              {submitError && <div className="mb-4 p-3 rounded-sm text-sm" style={{ background: 'rgba(245, 108, 108, 0.1)', border: '1px solid #f56c6c', color: '#f56c6c' }}>{submitError}</div>}
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#94a3b8' }}>* Campos requeridos</p>
                <button type="submit" disabled={submitting || !emailValidated} className="btn-primary flex items-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(248,245,238,0.4)', borderTopColor: '#000' }} />Enviando...</> : 'Enviar Solicitud'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center mt-8 text-xs" style={{ color: '#A89B7A' }}>
          © {new Date().getFullYear()} Mangone Law Firm · Uso interno exclusivo
        </p>
      </main>
    </div>
  )
}

function QuestionField({ question, value, onChange }: { question: FormQuestion; value: AnswerValue; onChange: (val: AnswerValue) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const labelEl = (
    <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
      {question.label}
    </label>
  )

  const inputStyle = { background: '#0f1115', borderColor: '#3f444d', color: 'white' }

  switch (question.type) {
    case 'text': case 'short_text':
      return <div>{labelEl}<input type="text" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" placeholder="Tu respuesta" style={inputStyle} /></div>
    case 'long_text': case 'textarea':
      return <div>{labelEl}<textarea value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" rows={4} placeholder="Tu respuesta" style={{ ...inputStyle, resize: 'vertical' }} /></div>
    case 'email':
      return <div>{labelEl}<input type="email" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" placeholder="correo@ejemplo.com" style={inputStyle} /></div>
    case 'number':
      return <div>{labelEl}<input type="number" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" style={inputStyle} /></div>
    case 'date':
      return <div>{labelEl}<input type="date" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" style={inputStyle} /></div>
    case 'dropdown': case 'select':
      return <div>{labelEl}<select value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input form-select" style={inputStyle}><option value="">— Selecciona —</option>{(question.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}</select></div>
    case 'checkbox': case 'multi_select':
      return <div>{labelEl}<div className="space-y-2">{(question.options || []).map((opt, i) => {
        const selected = Array.isArray(value) ? value.includes(opt) : false
        return <label key={i} className="flex items-center gap-3 cursor-pointer" onClick={() => { const cur = Array.isArray(value) ? value : []; onChange(selected ? cur.filter(v => v !== opt) : [...cur, opt]) }}>
          <div className="w-4 h-4 flex-shrink-0 rounded-sm flex items-center justify-center" style={{ border: `1.5px solid ${selected ? 'var(--gold)' : '#3f444d'}`, background: selected ? 'var(--gold)' : 'transparent' }}>
            {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-sm" style={{ color: '#e2e8f0' }}>{opt}</span>
        </label>
      })}</div></div>
    case 'radio':
      return <div>{labelEl}<div className="space-y-2">{(question.options || []).map((opt, i) => <label key={i} className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(opt)}>
        <div className="w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center" style={{ border: `1.5px solid ${value === opt ? 'var(--gold)' : '#3f444d'}` }}>
          {value === opt && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />}
        </div>
        <span className="text-sm" style={{ color: '#e2e8f0' }}>{opt}</span>
      </label>)}</div></div>
    case 'file':
      return <div>{labelEl}
        {question.template && <a href={question.template} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mb-3 text-xs underline" style={{ color: 'var(--gold-dark)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Descargar plantilla
        </a>}
        <div className="file-drop-zone" onClick={() => fileRef.current?.click()} style={{ background: '#0f1115', borderColor: '#3f444d' }}>
          {fileName ? <div className="flex items-center justify-center gap-2" style={{ color: '#4ade80' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg><span className="text-sm font-medium">{fileName}</span></div>
          : <><svg className="mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#94a3b8' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p className="text-sm" style={{ color: '#94a3b8' }}>Haz clic para adjuntar un archivo</p><p className="text-xs mt-1" style={{ color: '#64748b' }}>PDF, DOC, XLS hasta 10MB</p></>}
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFileName(f.name); onChange(f) } }} /></div>
    default:
      return <div>{labelEl}<input type="text" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="form-input" placeholder="Tu respuesta" style={inputStyle} /></div>
  }
}
