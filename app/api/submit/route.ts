import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa la llave secreta en el servidor
)

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { applicantEmail, topicId, topicName, topicPulseId, answers } = body

    // Save to formResponses table in Supabase
    const { data, error } = await supabase
      .from('formResponses')
      .insert([
        {
          submitted_by: session.user.email,
          applicant_email: applicantEmail,
          topic_id: topicId,
          topic_name: topicName,
          topic_pulse_id: topicPulseId,
          answers: answers,
          submitted_at: new Date().toISOString(),
          status: 'pending',
        },
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Error al guardar el formulario', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Formulario enviado correctamente',
      id: data?.[0]?.id,
    })
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
