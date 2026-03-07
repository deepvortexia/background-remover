import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TOOL_TYPE = 'bg-remover'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const authHeader = req.headers.authorization
  console.log('[favorites] Method:', req.method, '| Auth header present:', !!authHeader)
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token)

  if (authError || !user) {
    console.error('[favorites] Auth failed:', JSON.stringify(authError))
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, result_url, metadata, created_at')
      .eq('user_id', user.id)
      .eq('tool_type', TOOL_TYPE)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[favorites] Fetch error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch favorites' })
    }

    return res.status(200).json({ favorites: data || [] })
  }

  if (req.method === 'POST') {
    const { result_url } = req.body
    console.log('[favorites] POST body:', { result_url: result_url?.slice(0, 60) + '...' })

    if (!result_url) {
      return res.status(400).json({ error: 'result_url is required' })
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, tool_type: TOOL_TYPE, result_url })
      .select('id')
      .single()

    if (error) {
      console.error('[favorites] Insert error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to save favorite' })
    }

    return res.status(200).json({ success: true, id: data.id })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('tool_type', TOOL_TYPE)

    if (error) {
      console.error('[favorites] Delete error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to delete favorite' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
