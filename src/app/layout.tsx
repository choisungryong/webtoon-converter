import type { Metadata } from "next";
import "./globals.css";

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
                {children}
            </body>
        </html>
    );
}