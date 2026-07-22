#!/bin/bash

# Script to deploy the complete Wakeel Management System

echo "🚀 Starting deployment of Wakeel Management System..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Remove existing git repository if it exists
if [ -d ".git" ]; then
    echo "📁 Removing existing git repository..."
    rm -rf .git
fi

# Initialize new git repository
echo "🔧 Initializing new git repository..."
git init

# Add all files
echo "📦 Adding all files to git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Complete Wakeel Management System

- Dashboard with comprehensive statistics
- Subscriber management (CRUD operations)
- Package management
- Receipts and billing system
- Reports and analytics
- User management
- Settings configuration
- Subscriber info page
- Arabic support with Cairo font
- Modern UI with Tailwind CSS
- React Query for state management
- TypeScript for type safety"

# Add remote origin
echo "🌐 Adding remote origin..."
git remote add origin https://github.com/ahmednabil21/wakeel.git

# Force push to replace repository contents
echo "⬆️ Force pushing to remote repository..."
git push -f origin main

echo "✅ Deployment completed successfully!"
echo "🔗 Repository: https://github.com/ahmednabil21/wakeel.git"
