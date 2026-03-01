import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

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
          is_favorite: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving favorite:', error)
        return res.status(500).json({ error: 'Failed to save favorite' })
      }

      return res.status(200).json({ success: true, id: data.id })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save favorite' })
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch favorites' })
      }

      return res.status(200).json({ favorites: data || [] })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch favorites' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
