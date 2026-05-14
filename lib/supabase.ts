import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  'corpemail': string
  coordinator: boolean
  name?: string
}

export type FormTopic = {
  id: string
  name: string
  pulseid: string
  description: string
  responsible: string[]
  active: boolean
  access: 'All' | 'Manager'
}

export type FormQuestion = {
  id: string
  topic_id: string
  order_index: number
  subitempulse: string
  type: string
  label: string
  options: string[]
  topicname: string
  template: string
}
