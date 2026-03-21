import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

// Use service role key to bypass RLS on server-side
// Auth verification is still done via getUser(token) from the Authorization header
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

const VALID_PACKS = {
  'Starter':  { priceId: 'price_1T5FPTPRCOojlkAvi1fOqS2M', credits: 10 },
  'Basic':    { priceId: 'price_1T5FRrPRCOojlkAvyCd4ZHjo', credits: 30 },
  'Popular':  { priceId: 'price_1T6F5SPRCOojlkAvW8KQY5jj', credits: 75 },
  'Pro':      { priceId: 'price_1T5FUhPRCOojlkAv3HaP09N6', credits: 200 },
  'Ultimate': { priceId: 'price_1T6F4zPRCOojlkAv7yVpMsLq', credits: 500 },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { packName } = req.body

  if (!packName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const validPack = VALID_PACKS[packName as keyof typeof VALID_PACKS]
  if (!validPack) {
    return res.status(400).json({ error: 'Invalid pack name' })
  }

  // Get user from authorization header
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    // Verify the auth token with Supabase
    const token = authHeader.replace('Bearer ', '')
    let { data: { user }, error: authError } = await supabase.auth.getUser(token)

    // If token expired, the client should refresh - but give a helpful error
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message)
      return res.status(401).json({ 
        error: 'Authentication expired. Please try again.',
        code: 'TOKEN_EXPIRED'
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: validPack.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://emoticons.deepvortexai.com'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://emoticons.deepvortexai.com'}`,
      metadata: {
        packName,
        credits: validPack.credits.toString(),
        userId: user.id,
        app: 'emoticon-generator',
      },
    })

    return res.status(200).json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
    })
  }
}
