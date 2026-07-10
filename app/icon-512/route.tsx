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
            'linear-gradient(135deg, #3b82f6 0%, #0891b2 100%)',
          color: 'white',
          fontSize: 320,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        E
      </div>
    ),
    { width: 512, height: 512 }
  );
}
