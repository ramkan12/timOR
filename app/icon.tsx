import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1c1917',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#fda4af',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            fontFamily: 'serif',
          }}
        >
          OR
        </span>
      </div>
    ),
    { ...size }
  )
}
