#!/bin/bash
# Quick start script for TrackApp setup

echo "==================================="
echo "TrackApp - Quick Start Setup"
echo "==================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

echo "📥 Cloning TrackApp repository..."
git clone https://github.com/BugraOrhan1/trackapp-.git
cd trackapp-

if [ $? -ne 0 ]; then
    echo "❌ Failed to clone repository"
    exit 1
fi

echo "✅ Repository cloned successfully"
echo ""
echo "==================================="
echo "Project Structure:"
echo "==================================="
ls -la

echo ""
echo "==================================="
echo "Next Steps:"
echo "==================================="
echo ""
echo "1. FOR WEB APP DEPLOYMENT:"
echo "   - Update config.js with your API endpoint"
echo "   - Push to GitHub"
echo "   - Netlify will auto-deploy"
echo ""
echo "2. FOR RASPBERRY PI:"
echo "   - Copy rpi_live_scanner.py to your Pi"
echo "   - Follow BLUETOOTH_SETUP_RPI.md guide"
echo "   - Follow SETUP_GUIDE.md for service setup"
echo ""
echo "3. DATABASE SETUP:"
echo "   - Create Neon PostgreSQL account"
echo "   - Run DATABASE_SCHEMA.sql in Neon console"
echo "   - Set NEON_DATABASE_URL in Netlify environment"
echo ""
echo "4. ENVIRONMENT VARIABLES:"
echo "   - Copy .env.example to .env (for local testing)"
echo "   - Or use Netlify dashboard for production"
echo ""
echo "==================================="
echo "Documentation Files:"
echo "==================================="
echo "  📖 BLUETOOTH_SETUP_RPI.md    - Pi Bluetooth setup"
echo "  📖 DATABASE_SCHEMA.sql       - Database creation"
echo "  📖 NEON_SETUP.md             - Neon database guide"
echo "  📖 .env.example              - Environment template"
echo ""
echo "Ready to go! 🚀"
