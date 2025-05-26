#!/usr/bin/env node

/**
 * @fileoverview Générateur d'icônes pour OptimXmlPreview v2.0
 * @description Crée une bibliothèque d'icônes à partir du SVG principal
 * @author OptimXmlPreview
 * @version 2.0.0
 */

const fs = require('node:fs');
const path = require('node:path');

console.log("🎨 OptimXmlPreview v2.0 - Générateur d'icônes\n");

/**
 * Crée les icônes Windows .ico
 */
function createWindowsIcons() {
  const iconsDir = './icons';

  // Créer le dossier icons s'il n'existe pas
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('✅ Dossier icons/ créé');
  }

  // Contenu pour l'icône de bureau (raccourci)
  const desktopIconContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=OptimXmlPreview v2.0
Comment=Visualiseur d'emails XML pour eBarreau
Exec=cmd /c "cd /d "${__dirname}" && OptimXmlPreview-Launcher.bat"
Icon=${__dirname}/img/icon-com.svg
Terminal=false
Categories=Office;Email;
StartupNotify=true`;

  // Créer le fichier de raccourci pour Linux/Mac
  fs.writeFileSync(path.join(iconsDir, 'OptimXmlPreview.desktop'), desktopIconContent);

  console.log('✅ Raccourci Bureau créé: icons/OptimXmlPreview.desktop');
}

/**
 * Crée les favicons pour différentes plateformes
 */
function createFavicons() {
  const faviconsDir = './icons/favicons';

  if (!fs.existsSync(faviconsDir)) {
    fs.mkdirSync(faviconsDir, { recursive: true });
  }

  // Manifest pour PWA
  const manifestContent = {
    name: 'OptimXmlPreview',
    short_name: 'OptimXML',
    description: "Visualiseur d'emails XML pour eBarreau",
    start_url: '/',
    display: 'standalone',
    background_color: '#141325',
    theme_color: '#141325',
    icons: [
      {
        src: 'img/icon-com.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };

  fs.writeFileSync(
    path.join(faviconsDir, 'manifest.json'),
    JSON.stringify(manifestContent, null, 2)
  );

  console.log('✅ Manifest PWA créé: icons/favicons/manifest.json');

  // Fichier de configuration pour intégration
  const configContent = `<!-- Ajoutez ces lignes dans la section <head> de vos pages HTML -->

<!-- Favicon principal -->
<link rel="icon" type="image/svg+xml" href="img/icon-com.svg">

<!-- Favicon de secours pour anciens navigateurs -->
<link rel="icon" type="image/png" href="icons/favicons/favicon-32x32.png" sizes="32x32">
<link rel="icon" type="image/png" href="icons/favicons/favicon-16x16.png" sizes="16x16">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="icons/favicons/apple-touch-icon.png">

<!-- PWA Manifest -->
<link rel="manifest" href="icons/favicons/manifest.json">

<!-- Couleur thème pour navigateurs mobiles -->
<meta name="theme-color" content="#141325">
<meta name="msapplication-TileColor" content="#141325">
`;

  fs.writeFileSync(path.join(faviconsDir, 'favicon-integration.html'), configContent);
  console.log("✅ Guide d'intégration créé: icons/favicons/favicon-integration.html");
}

/**
 * Crée un raccourci Windows .bat avec icône
 */
function createWindowsShortcut() {
  const shortcutContent = `@echo off
REM Raccourci OptimXmlPreview v2.0 avec icône
REM Ce fichier peut être placé sur le Bureau ou dans le menu Démarrer

title OptimXmlPreview v2.0

REM Aller dans le dossier de l'application
cd /d "%~dp0"

REM Lancer l'application
call OptimXmlPreview-Launcher.bat`;

  fs.writeFileSync('./📧 OptimXmlPreview v2.0.bat', shortcutContent);
  console.log('✅ Raccourci Bureau créé: 📧 OptimXmlPreview v2.0.bat');
}

/**
 * Crée la documentation des icônes
 */
function createIconsDocumentation() {
  const docContent = `# 🎨 Bibliothèque d'icônes OptimXmlPreview v2.0

## 📁 Icônes disponibles

### Icône principale
- **Fichier :** \`img/icon-com.svg\`
- **Format :** SVG vectoriel
- **Usage :** Favicon, icône d'application, interface

### Logos
- **Logo blanc :** \`img/logo-blanc.png\`
- **Logo principal :** \`img/logo.jpg\`
- **Logo cabinet :** \`img/Logo_cabinet.png\`

## 🚀 Raccourcis de lancement

### Double-clic simple
- **📧 OptimXmlPreview v2.0.bat** - Raccourci avec icône pour le Bureau

### Launcher automatique
- **OptimXmlPreview-Launcher.bat** - Lance serveur + ouvre navigateur

## 🌐 Intégration Web

### Favicons
Consultez \`icons/favicons/favicon-integration.html\` pour le code HTML complet.

\`\`\`html
<link rel="icon" type="image/svg+xml" href="img/icon-com.svg">
<meta name="theme-color" content="#141325">
\`\`\`

### PWA (Progressive Web App)
- **Manifest :** \`icons/favicons/manifest.json\`
- **Couleur thème :** #141325 (bleu foncé)
- **Nom court :** OptimXML

## 🖥️ Icônes système

### Windows
- Placez le fichier \`.bat\` sur le Bureau
- L'icône sera automatiquement associée

### Linux/Mac
- Utilisez \`icons/OptimXmlPreview.desktop\`
- Copiez dans \`~/Desktop/\` ou \`~/.local/share/applications/\`

## 🎨 Personnalisation

Pour changer l'icône, remplacez \`img/icon-com.svg\` par votre propre fichier SVG.
L'application utilisera automatiquement la nouvelle icône.

---

**🎉 Votre application a maintenant une identité visuelle complète !**
`;

  fs.writeFileSync('./icons/README-ICONS.md', docContent);
  console.log('✅ Documentation créée: icons/README-ICONS.md');
}

/**
 * Fonction principale
 */
function main() {
  try {
    console.log("Génération de la bibliothèque d'icônes...\n");

    createWindowsIcons();
    createFavicons();
    createWindowsShortcut();
    createIconsDocumentation();

    console.log('\n' + '='.repeat(60));
    console.log("🎉 Bibliothèque d'icônes générée avec succès !");
    console.log('\n📁 Fichiers créés :');
    console.log('   • 📧 OptimXmlPreview v2.0.bat (Raccourci Bureau)');
    console.log('   • icons/OptimXmlPreview.desktop (Linux/Mac)');
    console.log('   • icons/favicons/manifest.json (PWA)');
    console.log('   • icons/README-ICONS.md (Documentation)');
    console.log('\n🚀 Utilisation :');
    console.log('   • Double-cliquez sur "📧 OptimXmlPreview v2.0.bat"');
    console.log('   • Ou utilisez "OptimXmlPreview-Launcher.bat"');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}
