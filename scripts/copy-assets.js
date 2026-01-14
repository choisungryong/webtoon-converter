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

// Copy everything from .open-next to .vercel/output/static to ensure worker dependencies resolve correctly
const openNextDir = path.join(__dirname, '..', '.open-next');

if (fs.existsSync(openNextDir)) {
    console.log(`📦 Copying ALL OpenNext output to ${targetDir}...`);

    // Copy all contents of .open-next recursively to .vercel/output/static
    copyRecursive(openNextDir, targetDir);

    // Rename worker.js to _worker.js inside the static directory for Cloudflare Pages detection
    const workerInStatic = path.join(targetDir, 'worker.js');
    const workerAdvanced = path.join(targetDir, '_worker.js');

    if (fs.existsSync(workerInStatic)) {
        fs.renameSync(workerInStatic, workerAdvanced);
        console.log('   Renamed worker.js to _worker.js for Advanced Mode');
    }
}

console.log('✅ Assets copied successfully!');
