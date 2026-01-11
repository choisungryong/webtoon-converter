'use client';
import { Layout, Menu } from 'antd';
import { VideoCameraOutlined, FileImageOutlined, ThunderboltOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header: AntHeader } = Layout;

export default function Header() {
    const pathname = usePathname();

    const items = [
        {
            key: '/',
            label: <Link href="/">변환하기</Link>,
            icon: <VideoCameraOutlined />,
        },
        {
            key: '/gallery',
            label: <Link href="/gallery">갤러리</Link>,
            icon: <FileImageOutlined />,
        },
    ];

    return (
        <AntHeader style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            position: 'fixed',
            zIndex: 1000,
            width: '100%',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            height: '70px',
            padding: '0 24px'
        }}>
            <Link href="/" className="demo-logo" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(204,255,0,0.4)]">
                    <ThunderboltOutlined style={{ fontSize: '18px', color: '#000' }} />
                </div>
                <span style={{ color: '#fff', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    ToonSnap
                </span>
            </Link>

            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[pathname]}
                items={items}
                style={{
                    flex: '0 0 auto',
                    background: 'transparent',
                    borderBottom: 'none',
                    fontSize: '15px',
                    fontWeight: 500
                }}
            />
        </AntHeader>
    );
}
