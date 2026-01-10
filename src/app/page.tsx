'use client';

export const runtime = 'edge';

import React from 'react';
import { Upload, Button, Tag, ConfigProvider, theme } from 'antd';
import { InboxOutlined, RocketOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

export default function Home() {
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#CCFF00', // 네온 옐로우
                },
            }}
        >
            <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
                {/* 헤더 섹션 */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-black mb-4 tracking-tighter">
                        TOON<span className="text-neonYellow">SNAP</span>
                    </h1>
                    <p className="text-gray-400 text-lg">당신의 5초가 K-웹툰의 한 장면이 됩니다.</p>
                </div>

                {/* 업로드 영역 */}
                <div className="w-full max-w-2xl bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
                    <Dragger
                        className="bg-transparent border-2 border-dashed border-neonYellow/30 hover:border-neonYellow transition-colors"
                        style={{ borderRadius: '20px' }}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#CCFF00', fontSize: '48px' }} />
                        </p>
                        <p className="ant-upload-text text-white text-xl font-bold">영상을 여기에 드래그하거나 클릭하세요</p>
                        <p className="ant-upload-hint text-gray-500">5초 내외의 짧은 일상 영상을 권장합니다.</p>
                    </Dragger>

                    {/* 스타일 선택 영역 */}
                    <div className="mt-8">
                        <p className="text-sm text-gray-400 mb-3 ml-1">인기 웹툰 스타일 선택</p>
                        <div className="flex gap-2 flex-wrap">
                            <Tag className="px-4 py-1 rounded-full border-neonYellow text-neonYellow bg-transparent cursor-pointer hover:bg-neonYellow hover:text-black transition-all">#로맨스판타지</Tag>
                            <Tag className="px-4 py-1 rounded-full border-zinc-700 text-gray-400 bg-transparent cursor-pointer">#청춘드라마</Tag>
                            <Tag className="px-4 py-1 rounded-full border-zinc-700 text-gray-400 bg-transparent cursor-pointer">#스릴러/액션</Tag>
                            <Tag className="px-4 py-1 rounded-full border-zinc-700 text-gray-400 bg-transparent cursor-pointer">#90년대감성</Tag>
                        </div>
                    </div>

                    <Button
                        type="primary"
                        block
                        size="large"
                        icon={<RocketOutlined />}
                        className="mt-10 h-14 text-lg font-bold rounded-2xl bg-neonYellow text-black border-none hover:scale-[1.02] transition-transform"
                    >
                        웹툰으로 변환하기
                    </Button>
                </div>

                {/* 푸터 */}
                <p className="mt-12 text-zinc-600 text-sm italic">© 2026 ToonSnap AI Studio. Powered by Cloudflare</p>
            </main>
        </ConfigProvider>
    );
}