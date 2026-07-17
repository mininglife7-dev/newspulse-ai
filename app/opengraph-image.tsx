import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'EURO AI — AI Governance Made Simple';
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
        background: '#020617',
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
            'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.18) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(8,145,178,0.18) 0%, transparent 40%)',
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
              background: 'linear-gradient(135deg, #3b82f6 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 900,
              boxShadow: '0 0 40px rgba(59,130,246,0.5)',
            }}
          >
            E
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            EURO <span style={{ color: '#22d3ee' }}>AI</span>
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
            <span>AI Governance</span>
            <span
              style={{
                background: 'linear-gradient(90deg, #93c5fd 0%, #67e8f9 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Made Simple.
            </span>
          </div>
          <div style={{ fontSize: 28, color: '#94a3b8', maxWidth: 900 }}>
            Meet EU AI Act obligations with confidence.
          </div>
        </div>

        {/* Footer chip */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontSize: 20,
            color: '#22d3ee',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: '#22d3ee',
            }}
          />
          Inventory · Risk · Evidence · Remediation
        </div>
      </div>
    </div>,
    { ...size }
  );
}
