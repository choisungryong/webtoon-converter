/**
 * Copy OpenNext assets to Cloudflare Pages expected directory
 * OpenNext outputs to .open-next/assets
 * Cloudflare Pages expects .vercel/output/static
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '.open-next', 'assets');
const targetDir = path.join(__dirname, '..', '.vercel', 'output', 'static');

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.log(`Source not found: ${src}`);
        return;
    }

    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

console.log('📦 Copying assets to Cloudflare Pages directory...');
console.log(`   From: ${sourceDir}`);
console.log(`   To:   ${targetDir}`);

// Clean target directory
if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}

// Copy assets
copyRecursive(sourceDir, targetDir);

// Also copy the worker.js if needed
const workerSrc = path.join(__dirname, '..', '.open-next', 'worker.js');
const workerDest = path.join(__dirname, '..', '.vercel', 'output', '_worker.js');
if (fs.existsSync(workerSrc)) {
    fs.mkdirSync(path.dirname(workerDest), { recursive: true });
    fs.copyFileSync(workerSrc, workerDest);
    console.log('   Worker copied to _worker.js');
}

console.log('✅ Assets copied successfully!');
