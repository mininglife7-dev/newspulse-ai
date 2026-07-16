import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NewsPulse AI — AI-powered news scraper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0f1a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: 80,
        position: 'relative',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(139,92,246,0.18) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.18) 0%, transparent 40%)',
          display: 'flex',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          zIndex: 1,
        }}
      >
        {/* Logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 900,
              boxShadow: '0 0 40px rgba(139,92,246,0.5)',
            }}
          >
            ⚡
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            NewsPulse <span style={{ opacity: 0.6 }}>AI</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Search any topic.</span>
            <span
              style={{
                background:
                  'linear-gradient(90deg, #c4b5fd 0%, #a78bfa 50%, #818cf8 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Get the pulse instantly.
            </span>
          </div>
          <div style={{ fontSize: 28, color: '#a1a1b5', maxWidth: 900 }}>
            AI-powered news scraper. Firecrawl + OpenAI + Supabase.
          </div>
        </div>

        {/* Footer chip */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontSize: 20,
            color: '#a78bfa',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: '#a78bfa',
            }}
          />
          Live news, summarized by AI
        </div>
      </div>
    </div>,
    { ...size }
  );
}
