const otherTools = [
  { name: "Image Generator", desc: "AI artwork from text", url: "https://images.deepvortexai.art", icon: "🖼️" },
  { name: "Image Upscaler", desc: "Enhance resolution with AI", url: "https://upscaler.deepvortexai.art", icon: "🔍" },
  { name: "3D Generator", desc: "Transform images into 3D models", url: "https://3d.deepvortexai.art", icon: "🧊" },
  { name: "Voice Generator", desc: "AI text-to-speech generation", url: "https://voice.deepvortexai.art", icon: "🎙️" },
  { name: "Emoticon Generator", desc: "Custom AI emoji creation", url: "https://emoticons.deepvortexai.art", icon: "😀" },
  { name: "Image to Video", desc: "Animate any image with AI", url: "https://video.deepvortexai.art", icon: "🎬" },
  { name: "AI Chat Suite", desc: "4 frontier models in one place", url: "https://chat.deepvortexai.art", icon: "💬" },
  { name: "Deep Vortex Hub", desc: "All AI tools in one ecosystem", url: "https://deepvortexai.art", icon: "🌐" },
]

export function HowToUsePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', backgroundImage: 'radial-gradient(rgba(212,175,55,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>

      {/* Header */}
      <header style={{ textAlign: 'center', padding: '2.5rem 1rem 1rem', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <a href="https://bgremover.deepvortexai.art" style={{ display: 'inline-block', color: 'rgba(212,175,55,0.8)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '1.2rem', letterSpacing: '0.5px' }}>
          ← Back to Background Remover
        </a>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <img src="/logotinyreal.webp" alt="Deep Vortex AI" style={{ height: '58px', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '1px', background: 'linear-gradient(135deg, #E8C87C 0%, #D4AF37 60%, #B8860B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '0.6rem' }}>
          How to Use the AI Background Remover
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem' }}>Remove any background instantly with AI precision</p>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.2rem 5rem' }}>

        {/* Steps */}
        <section style={{ marginBottom: '3.5rem' }}>
          {[
            {
              num: 1,
              title: 'Upload Your Image',
              body: 'Drag & drop your photo onto the upload zone, or click to browse your files. Supports JPG, PNG, and WEBP formats. Any size works — the AI handles the rest.',
            },
            {
              num: 2,
              title: 'AI Removes the Background',
              body: 'Our AI instantly detects your subject and removes the background with precision. No manual selection, no masking — just one click and it\'s done in seconds.',
            },
            {
              num: 3,
              title: 'Download Your Result',
              body: 'Download your image as a transparent PNG, ready to use anywhere — product listings, social media, presentations, or any design project.',
            },
          ].map(({ num, title, body }) => (
            <div key={num} style={{ display: 'flex', gap: '1.4rem', alignItems: 'flex-start', marginBottom: '2rem', background: 'rgba(20,18,10,0.85)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '16px', padding: '1.6rem', backdropFilter: 'blur(12px)' }}>
              <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #E8C87C, #D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.1rem', color: '#0a0a0a' }}>
                {num}
              </div>
              <div>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#E8C87C', marginBottom: '0.5rem' }}>{title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, fontSize: '0.93rem' }}>{body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Pro Tip */}
        <section style={{ marginBottom: '3.5rem', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '16px', padding: '1.6rem 1.8rem' }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: '#D4AF37', letterSpacing: '1.5px', marginBottom: '0.6rem' }}>⚡ PRO TIP</p>
          <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, fontSize: '0.93rem' }}>
            Works best with <strong style={{ color: '#E8C87C' }}>clear subjects</strong> — portraits, products, and logos get the cleanest results.
          </p>
          <p style={{ marginTop: '0.7rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Tip: Use a well-lit photo with good contrast between subject and background for best accuracy.
          </p>
        </section>

        {/* Other Tools */}
        <section>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#E8C87C', textAlign: 'center', marginBottom: '1.6rem', letterSpacing: '1px' }}>
            Explore Our Other AI Tools
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.9rem' }}>
            {otherTools.map((tool) => (
              <a key={tool.url} href={tool.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '1rem 1.1rem', background: 'rgba(20,18,10,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.25s, box-shadow 0.25s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,175,55,0.6)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(212,175,55,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,175,55,0.2)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none' }}
              >
                <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#D4AF37' }}>{tool.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{tool.desc}</span>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <a href="https://bgremover.deepvortexai.art" style={{ display: 'inline-block', padding: '0.7rem 2rem', background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#0a0a0a', borderRadius: '50px', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', letterSpacing: '0.5px' }}>
            Remove a Background →
          </a>
        </div>

      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', borderTop: '1px solid rgba(212,175,55,0.15)', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
        <a href="https://deepvortexai.art" style={{ color: 'rgba(212,175,55,0.6)', textDecoration: 'none' }}>Deep Vortex AI</a> — Building the complete AI creative ecosystem
      </footer>
    </div>
  )
}
