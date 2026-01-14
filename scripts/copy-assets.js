/**
 * Copy OpenNext assets to Cloudflare Pages expected directory
 * OpenNext outputs to .open-next/assets
 * Cloudflare Pages expects .vercel/output (Root)
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '.open-next', 'assets');
const targetDir = path.join(__dirname, '..', '.vercel', 'output');

// Additional backup source: Next.js original build output
const nextStaticDir = path.join(__dirname, '..', '.next', 'static');
const targetNextStaticDir = path.join(targetDir, '_next', 'static');

function copyRecursive(src, dest, overwrite = true) {
    if (!fs.existsSync(src)) {
        console.log(`Source not found: ${src}`);
        return;
    }

    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry), overwrite);
        }
    } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (overwrite || !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
        }
    }
}

console.log('📦 Copying assets to Cloudflare Pages output root...');
console.log(`   From: ${sourceDir}`);
console.log(`   To:   ${targetDir}`);

// Clean target directory
if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}

// 1. Copy OpenNext Assets
if (fs.existsSync(sourceDir)) {
    copyRecursive(sourceDir, targetDir);
} else {
    console.error(`❌ Error: Source assets directory not found at ${sourceDir}`);
}

// 2. FORCE COPY: Next.js Original Static Assets (CSS/JS)
// This ensures that even if OpenNext missed them, we have the CSS/JS files.
if (fs.existsSync(nextStaticDir)) {
    console.log(`🚑 Emergency: Force copying Next.js static assets from .next/static...`);
    copyRecursive(nextStaticDir, targetNextStaticDir, true);
} else {
    console.warn('⚠️ Warning: .next/static not found. Build might be incomplete.');
}

// ... existing worker copy and patch logic ...
// 3. Copy Server Code (Worker)
const openNextDir = path.join(__dirname, '..', '.open-next');

if (fs.existsSync(openNextDir)) {
    console.log(`📦 Copying OpenNext server code to ${targetDir}...`);

    // Copy everything from .open-next to targetDir (no overwrite)
    copyRecursive(openNextDir, targetDir, false);

    // Rename worker.js to _worker.js inside the root directory
    const workerInRoot = path.join(targetDir, 'worker.js');
    const workerAdvanced = path.join(targetDir, '_worker.js');

    if (fs.existsSync(workerInRoot)) {
        fs.renameSync(workerInRoot, workerAdvanced);
        console.log('   Renamed worker.js to _worker.js for Advanced Mode');
    }

    // PATCH: Fix Node.js built-in module import errors
    function patchFiles(dir) {
        const modulesToPatch = [
            'child_process', 'tty', 'os', 'util', 'fs', 'path',
            'events', 'stream', 'buffer', 'crypto', 'assert',
            'url', 'querystring', 'zlib', 'http', 'https', 'net',
            'tls', 'dgram', 'dns', 'perf_hooks', 'punycode',
            'readline', 'repl', 'string_decoder', 'v8', 'vm',
            'async_hooks', 'worker_threads', 'inspector', 'cluster',
            'constants', 'module', 'process', 'sys', 'timers',
            'http2', 'domain', 'trace_events', 'wasi', 'diagnostics_channel'
        ];

        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                patchFiles(fullPath);
            } else if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;

                for (const mod of modulesToPatch) {
                    const requireRegex = new RegExp(`require\\("${mod}"\\)`, 'g');
                    if (requireRegex.test(content)) {
                        content = content.replace(requireRegex, `require("node:${mod}")`);
                        modified = true;
                    }
                    const importRegex = new RegExp(`from "${mod}"`, 'g');
                    if (importRegex.test(content)) {
                        content = content.replace(importRegex, `from "node:${mod}"`);
                        modified = true;
                    }
                }

                if (modified) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`   🔧 Patched Node.js modules in: ${entry}`);
                }
            }
        }
    }

    console.log('🛠️ Patching files for Cloudflare compatibility...');
    patchFiles(targetDir);
}

console.log('✅ Assets and Worker copied successfully to root!');
