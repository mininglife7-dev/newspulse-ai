import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// 192x192 PWA icon referenced by the web manifest. Rendered dynamically so no
// binary asset needs to live in the repo. Matches the app's gradient identity.
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
          fontSize: 120,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        G
      </div>
    ),
    { width: 192, height: 192 }
  );
}
