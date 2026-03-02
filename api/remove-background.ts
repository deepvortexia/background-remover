import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[remove-background] Request received:', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'Image is required' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Please sign in to remove backgrounds' })
  }

  const apiKey = process.env.REPLICATE_API_TOKEN
  if (!apiKey) {
    return res.status(500).json({ error: 'Replicate API key not configured' })
  }

  let userId: string
  let currentCredits: number

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    userId = user.id
    console.log('[remove-background] User verified:', { userId: user.id })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    if (!profile || profile.credits < 1) {
      return res.status(402).json({ error: 'Insufficient credits. Please purchase more credits to continue.' })
    }

    currentCredits = profile.credits

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        credits: profile.credits - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('credits', profile.credits)
      .select()
      .single()

    if (updateError || !updatedProfile) {
      return res.status(409).json({ error: 'Credit check failed, please try again' })
    }
  } catch (error: any) {
    console.error('[remove-background] Auth error:', error)
    return res.status(500).json({ error: 'Failed to verify credits' })
  }

  let generationFailed = false

  try {
    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`

    const response = await fetch('https://api.replicate.com/v1/models/lucataco/remove-bg/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          image: imageDataUrl,
        },
      }),
    })

    const prediction = await response.json()
    console.log('[remove-background] Replicate response:', { status: response.status, ok: response.ok })

    if (!response.ok) {
      generationFailed = true
      throw new Error(prediction.detail || 'Failed to create prediction')
    }

    // Poll for completion
    let result = prediction
    const pollStartTime = Date.now()

    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { 'Authorization': `Token ${apiKey}` } }
      )

      if (!pollResponse.ok) {
        generationFailed = true
        throw new Error(`Failed to poll prediction status: ${pollResponse.status}`)
      }

      result = await pollResponse.json()
      console.log('[remove-background] Poll result:', { status: result.status, id: result.id })

      if (Date.now() - pollStartTime > 60000) {
        generationFailed = true
        throw new Error('Processing timeout')
      }
    }

    if (result.status === 'failed') {
      generationFailed = true
      throw new Error(result.error || 'Background removal failed')
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output

    if (!outputUrl) {
      generationFailed = true
      throw new Error('No image returned from model')
    }

    // Upload to Supabase Storage for a permanent URL
    let imageUrl: string = outputUrl
    try {
      const imgRes = await fetch(outputUrl)
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer()
        const fileName = `${userId}/${Date.now()}-bg-removed.png`
        const { error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName)
          if (publicUrl) {
            imageUrl = publicUrl
            console.log('[remove-background] Uploaded to Supabase Storage:', imageUrl)
          }
        } else {
          console.error('[remove-background] Storage upload failed, using Replicate URL:', uploadError)
        }
      }
    } catch (storageErr) {
      console.error('[remove-background] Storage error, using Replicate URL:', storageErr)
    }

    // Log transaction (non-blocking)
    supabase
      .from('generation_logs')
      .insert({ user_id: userId, tool: 'background-remover', created_at: new Date().toISOString() })
      .then(() => {})
      .catch(() => {})

    return res.status(200).json({ image: imageUrl })
  } catch (error: any) {
    console.error('[remove-background] Error:', error?.message)

    if (generationFailed) {
      try {
        await supabase
          .from('profiles')
          .update({ credits: currentCredits, updated_at: new Date().toISOString() })
          .eq('id', userId)
        console.log(`[remove-background] Refunded credit to user ${userId}`)
      } catch (refundError) {
        console.error('[remove-background] Failed to refund credit:', refundError)
      }
    }

    return res.status(500).json({ error: error.message || 'Failed to remove background' })
  }
}
