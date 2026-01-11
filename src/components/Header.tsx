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
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            position: 'fixed',
            zIndex: 1000,
            width: '100%',
            borderBottom: '1px solid #333'
        }}>
            <div className="demo-logo" style={{ marginRight: '40px', display: 'flex', alignItems: 'center' }}>
                <ThunderboltOutlined style={{ fontSize: '24px', color: '#CCFF00', marginRight: '10px' }} />
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>ToonSnap</span>
            </div>

            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[pathname]}
                items={items}
                style={{ flex: 1, minWidth: 0, background: 'transparent' }}
            />
        </AntHeader>
    );
}
