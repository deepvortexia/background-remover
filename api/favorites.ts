import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[favorites] Missing env vars:', { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey })
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Anon key client for JWT verification only
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

  if (authError || !user) {
    console.error('[favorites] Auth error:', authError?.message)
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

  // Service role client for DB operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

  if (req.method === 'POST') {
    const { imageUrl, prompt } = req.body

    if (!imageUrl || !prompt) {
      return res.status(400).json({ error: 'imageUrl and prompt are required' })
    }

    try {
      const { data, error } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          prompt,
          image_url: imageUrl,
          aspect_ratio: '1:1',
          is_favorite: true,
        })
        .select()
        .single()

      if (error) {
        console.error('[favorites] Insert error:', error.message, error.details)
        return res.status(500).json({ error: 'Failed to save favorite' })
      }

      console.log('[favorites] Saved favorite for user', user.id, 'id:', data.id)
      return res.status(200).json({ success: true, id: data.id })
    } catch (err: any) {
      console.error('[favorites] Unexpected error:', err)
      return res.status(500).json({ error: err.message || 'Failed to save favorite' })
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('id, prompt, image_url, created_at')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[favorites] Fetch error:', error.message)
        return res.status(500).json({ error: 'Failed to fetch favorites' })
      }

      return res.status(200).json({ favorites: data || [] })
    } catch (err: any) {
      console.error('[favorites] Unexpected error:', err)
      return res.status(500).json({ error: err.message || 'Failed to fetch favorites' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
