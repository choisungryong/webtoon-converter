import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'BanaToon - AI 웹툰 변환 서비스'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0a0a0a',
                    backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a2e 0%, #0a0a0a 50%)',
                }}
            >
                {/* Logo and Title */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 40,
                    }}
                >
                    <span style={{ fontSize: 80, marginRight: 20 }}>🍌</span>
                    <span
                        style={{
                            fontSize: 72,
                            fontWeight: 'bold',
                            color: '#CCFF00',
                            textShadow: '0 4px 20px rgba(204, 255, 0, 0.4)',
                        }}
                    >
                        BanaToon
                    </span>
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: 36,
                        color: '#ffffff',
                        marginBottom: 60,
                    }}
                >
                    일상의 바이브를 툰으로 담는다
                </div>

                {/* Features */}
                <div
                    style={{
                        display: 'flex',
                        gap: 40,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px 32px',
                            backgroundColor: 'rgba(204, 255, 0, 0.1)',
                            borderRadius: 16,
                            border: '1px solid rgba(204, 255, 0, 0.3)',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#CCFF00' }}>✨ AI 기반 변환</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px 32px',
                            backgroundColor: 'rgba(204, 255, 0, 0.1)',
                            borderRadius: 16,
                            border: '1px solid rgba(204, 255, 0, 0.3)',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#CCFF00' }}>🎨 K-웹툰 스타일</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px 32px',
                            backgroundColor: 'rgba(204, 255, 0, 0.1)',
                            borderRadius: 16,
                            border: '1px solid rgba(204, 255, 0, 0.3)',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#CCFF00' }}>🆓 무료 이용</span>
                    </div>
                </div>

                {/* URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        fontSize: 24,
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}
                >
                    banatoon.app
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
