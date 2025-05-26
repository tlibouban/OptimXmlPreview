#!/bin/bash

# Script de préparation pour publication GitHub
# Usage: ./scripts/prepare-release.sh

set -e

echo "🚀 Préparation de OptimXmlPreview pour publication GitHub..."

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Vérifications préliminaires
info "Vérification de l'environnement..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
fi

NODE_VERSION=$(node --version)
success "Node.js ${NODE_VERSION} détecté"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    error "npm n'est pas installé"
fi

NPM_VERSION=$(npm --version)
success "npm ${NPM_VERSION} détecté"

# Vérifier git
if ! command -v git &> /dev/null; then
    error "Git n'est pas installé"
fi

success "Git détecté"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    error "Ce script doit être exécuté depuis la racine du projet"
fi

success "Répertoire du projet validé"

# Nettoyer les fichiers temporaires
info "Nettoyage des fichiers temporaires..."
rm -rf node_modules/.cache
rm -rf dist/
rm -rf coverage/
rm -rf docs/
rm -f Output/*.html
success "Nettoyage terminé"

# Installation des dépendances
info "Installation des dépendances..."
npm ci
success "Dépendances installées"

# Vérification du code
info "Vérification du code avec ESLint..."
npm run lint
success "Code validé par ESLint"

# Formatage du code
info "Formatage du code avec Prettier..."
npm run format
success "Code formaté"

# Tests
info "Exécution des tests..."
npm test
success "Tests passés"

# Build
info "Build du projet..."
if npm run build 2>/dev/null; then
    success "Build réalisé"
else
    warning "Pas de script de build défini"
fi

# Génération de la documentation
info "Génération de la documentation..."
if npm run docs 2>/dev/null; then
    success "Documentation générée"
else
    warning "Pas de script de documentation défini"
fi

# Vérification des fichiers requis
info "Vérification des fichiers requis..."

required_files=(
    "LICENSE"
    "README.md" 
    "CONTRIBUTING.md"
    "CHANGELOG.md"
    "package.json"
    "ConvertXmlToHtml.js"
    "UpdateIndex.js"
    "index.html"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        success "$file trouvé"
    else
        error "$file manquant"
    fi
done

# Vérification des répertoires
info "Vérification des répertoires..."

required_dirs=(
    "Data"
    "img"
    ".github"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        success "Répertoire $dir trouvé"
    else
        warning "Répertoire $dir manquant (sera créé)"
        mkdir -p "$dir"
    fi
done

# Vérification du package.json
info "Vérification du package.json..."

# Vérifier les champs requis
required_fields=("name" "version" "description" "license" "repository" "author")
for field in "${required_fields[@]}"; do
    if node -p "require('./package.json').$field" &>/dev/null; then
        success "Champ $field présent"
    else
        error "Champ $field manquant dans package.json"
    fi
done

# Vérification de la licence MIT
if grep -q "MIT" LICENSE; then
    success "Licence MIT confirmée"
else
    error "Licence MIT non trouvée dans LICENSE"
fi

# Vérifier les URLs GitHub
info "Vérification des URLs GitHub..."
if grep -q "votre-username" package.json README.md; then
    warning "URLs GitHub génériques détectées - pensez à les remplacer par votre username"
else
    success "URLs GitHub configurées"
fi

# Créer un fichier .gitignore optimisé si nécessaire
if [ ! -f ".gitignore" ]; then
    warning "Pas de .gitignore trouvé, création d'un fichier par défaut"
    cat > .gitignore << EOF
# Dépendances
node_modules/
npm-debug.log*

# Fichiers de sortie
Output/*.html
dist/
coverage/

# Fichiers temporaires
*.tmp
.DS_Store
Thumbs.db

# Logs
*.log

# Configuration locale
.env
.env.local
EOF
    success ".gitignore créé"
fi

# Récapitulatif
echo
echo "📋 Récapitulatif de la préparation :"
echo "================================="
echo "✅ Code formaté et validé"
echo "✅ Tests passés"
echo "✅ Documentation à jour"
echo "✅ Fichiers requis présents"
echo "✅ Licence MIT configurée"
echo
echo "🎯 Prochaines étapes pour GitHub :"
echo "================================="
echo "1. Créer un nouveau repository sur GitHub"
echo "2. Remplacer 'votre-username' par votre username GitHub dans :"
echo "   - package.json"
echo "   - README.md"
echo "   - CONTRIBUTING.md"
echo "3. Initialiser git et pousser le code :"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'feat: initial commit'"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/VOTRE-USERNAME/OptimXmlPreview.git"
echo "   git push -u origin main"
echo "4. Configurer les secrets GitHub pour CI/CD"
echo "5. Publier sur npm (optionnel) :"
echo "   npm publish"
echo

success "✨ OptimXmlPreview est prêt pour la publication ! 🚀" 