import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import "./globals.css";

// runtime config removed to use default nodejs_compat

export const metadata: Metadata = {
    title: "ToonSnap - 당신의 일상을 K-웹툰으로",
    description: "AI 기반 K-콘텐츠 변환 서비스",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body className="bg-[#0a0a0a] min-h-screen flex flex-col">
                <AntdRegistry>
                    <main className="flex-1">
                        {children}
                    </main>

                    {/* Footer with Disclaimer */}
                    <footer className="border-t border-white/10 py-6 px-4 text-center">
                        <p className="text-gray-500 text-xs max-w-2xl mx-auto">
                            본 서비스에서 제공하는 스타일은 AI가 학습한 데이터를 기반으로 재창조된 것이며,
                            특정 브랜드나 작가와는 무관합니다.
                        </p>
                        <p className="text-gray-600 text-xs mt-2">
                            © 2026 ToonSnap. All rights reserved.
                        </p>
                    </footer>
                </AntdRegistry>
            </body>
        </html>
    );
}