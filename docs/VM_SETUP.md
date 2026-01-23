# VM Development Environment Setup Guide

This guide describes how to set up the `webtoon-converter` project on a fresh Virtual Machine (Ubuntu/Debian recommended).

## 1. Prerequisites

Ensure your VM has internet access.

### Install Node.js (via NVM recommended)

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Activate NVM
source ~/.bashrc

# Install Node.js (LTS)
nvm install --lts
nvm use --lts
```

### Install Git & Wrangler

```bash
# Install Git
sudo apt update
sudo apt install git -y

# Install Wrangler (Cloudflare CLI)
npm install -g wrangler
```

## 2. Project Setup

### Clone the Repository

```bash
git clone <YOUR_REPO_URL> webtoon-converter
cd webtoon-converter
```

### Install Dependencies

```bash
npm install
```

### Environment Configuration

1.  **Cloudflare Login**:
    You must login to Cloudflare to access your D1 Database and R2 Storage.

    ```bash
    npx wrangler login
    ```

    Follow the link provided to authenticate.

2.  **Environment Variables**:
    Create a `.env.local` file in the root directory for your secrets.

    ```bash
    nano .env.local
    ```

    Add your secrets (e.g., Replicate API Token):

    ```env
    REPLICATE_API_TOKEN=your_token_here
    ```

3.  **Wrangler Configuration**:
    Edit `wrangler.toml` to verify your Database ID and Bucket Name match your Cloudflare dashboard.
    ```bash
    nano wrangler.toml
    ```

## 3. Running the Project

### Local Development Server

To run the project with full Cloudflare bindings support (D1, R2, AI):

```bash
# Standard Next.js dev (might not connect to remote D1/R2 automatically without proxy)
npm run dev

# OR using Wrangler (Recommended for binding support)
npx wrangler pages dev .vercel/output/static --compatibility-date=2024-01-01 --compatibility-flags=nodejs_compat
```

## 4. Automated Setup Script (Non-Docker)

You can use the provided script to automate system installation.

```bash
chmod +x scripts/setup-vm.sh
./scripts/setup-vm.sh
```

## 5. Docker Deployment (Easiest)

If you prefer not to install Node.js manually, you can use Docker.

1.  **Install Docker** (if not installed)

    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    ```

2.  **Run with Docker Compose**
    Make sure your `REPLICATE_API_TOKEN` is set in the current shell or `.env` file.
    ```bash
    export REPLICATE_API_TOKEN=your_token_here
    docker compose up -d --build
    ```
    The app will be available at `http://localhost:3000`.
