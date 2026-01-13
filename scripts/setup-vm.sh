#!/bin/bash

# setup-vm.sh
# Automates the setup of the webtoon-converter web application on a fresh Ubuntu/Debian VM.

set -e # Exit on error

echo "🚀 Starting VM Environment Setup..."

# 1. System Updates
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl build-essential

# 2. Install Node.js (via NVM)
echo "🟢 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm alias default lts
    echo "Node.js $(node -v) installed."
else
    echo "Node.js is already installed: $(node -v)"
fi

# 3. Install Global Tools
echo "🛠️ Installing global tools (Wrangler)..."
npm install -g wrangler create-next-app

# 4. Project Setup (Assumes script is run from project root or inside it)
# If not in project root, you might want to clone here.
if [ -f "package.json" ]; then
    echo "📂 Project detected. Installing dependencies..."
    npm install
else
    echo "⚠️ package.json not found. Please run this script inside the project directory or clone the repo first."
fi

echo "✅ Setup Complete!"
echo "---------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Run 'npx wrangler login' to authenticate with Cloudflare."
echo "2. Create '.env.local' and add your REPLICATE_API_TOKEN."
echo "3. Update 'wrangler.toml' with your specific DB IDs if needed."
echo "4. Start developing with 'npm run dev'!"
echo "---------------------------------------------------"
