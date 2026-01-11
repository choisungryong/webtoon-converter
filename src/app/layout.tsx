import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Header from '../components/Header';
import "./globals.css";

export const runtime = 'edge';

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
            <body>
                <AntdRegistry>
                    <Header />
                    <div style={{ paddingTop: '64px' }}>
                        {children}
                    </div>
                </AntdRegistry>
            </body>
        </html>
    );
}