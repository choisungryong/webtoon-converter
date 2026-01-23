import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Links */}
        <nav className="mb-6 flex flex-wrap justify-center gap-4 md:gap-8">
          <Link
            href="/about"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            서비스 소개
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            갤러리
          </Link>
          <Link
            href="/faq"
            className="text-sm font-semibold text-neonYellow transition-colors hover:text-neonYellow/80"
          >
            FAQ
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            이용약관
          </Link>
          <Link
            href="/contact"
            className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
          >
            문의하기
          </Link>
        </nav>

        {/* Disclaimer */}
        <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-gray-500">
          본 서비스에서 제공하는 스타일은 AI가 학습한 데이터를 기반으로 재창조된 것이며, 특정
          브랜드나 작가와는 무관합니다.
        </p>

        <p className="text-center text-xs text-gray-600">© 2026 BanaToon. All rights reserved.</p>
      </div>
    </footer>
  );
}
