import { ImageResponse } from 'next/og';

// Image metadata
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Programmatic favicon — matches the gradient bolt in the header
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3b82f6 0%, #0891b2 100%)',
        borderRadius: 8,
        color: 'white',
        fontSize: 22,
        fontWeight: 900,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      E
    </div>,
    { ...size }
  );
}
