import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// 512x512 PWA icon (also used as the maskable icon) referenced by the manifest.
export function GET() {
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
          fontSize: 320,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        G
      </div>
    ),
    { width: 512, height: 512 }
  );
}
