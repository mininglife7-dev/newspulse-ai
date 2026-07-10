import { ImageResponse } from 'next/og';

// Image metadata — Next.js auto-links this as <link rel="apple-touch-icon">,
// which is what iOS Safari uses for the Home Screen icon.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
          color: 'white',
          fontSize: 112,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
