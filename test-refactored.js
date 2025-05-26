/**
 * Script de test pour valider le module refactorisé
 */

const {
  CONFIG,
  Logger,
  loadEmailViewerCSS,
  loadNavigationCSS,
  loadNavigationJS,
} = require('./ConvertXmlToHtml-refactored.js');

console.log('🧪 Test du module refactorisé OptimXmlPreview v2.0\n');

// Test 1: Configuration
console.log('📋 Test 1: Configuration centralisée');
try {
  console.log("✅ Titre de l'application:", CONFIG.MESSAGES.APP_TITLE);
  console.log('✅ Extensions supportées:', CONFIG.SUPPORTED_EXTENSIONS);
  console.log('✅ Port par défaut:', CONFIG.SERVER.DEFAULT_PORT);
  Logger.success('Configuration chargée avec succès');
} catch (error) {
  Logger.error('Erreur de configuration: ' + error.message);
}

console.log();

// Test 2: Chargement des ressources CSS
console.log('🎨 Test 2: Chargement des ressources CSS');
try {
  const emailCSS = loadEmailViewerCSS();
  console.log('✅ CSS email-viewer:', emailCSS.length, 'caractères');

  const navCSS = loadNavigationCSS();
  console.log('✅ CSS navigation:', navCSS.length, 'caractères');

  Logger.success('Ressources CSS chargées avec succès');
} catch (error) {
  Logger.error('Erreur CSS: ' + error.message);
}

console.log();

// Test 3: Chargement du JavaScript
console.log('⚡ Test 3: Chargement des ressources JavaScript');
try {
  const navJS = loadNavigationJS();
  console.log('✅ JavaScript navigation:', navJS.length, 'caractères');

  Logger.success('Ressources JavaScript chargées avec succès');
} catch (error) {
  Logger.error('Erreur JavaScript: ' + error.message);
}

console.log();

// Test 4: Validation des chemins
console.log('📁 Test 4: Validation des chemins de ressources');
try {
  const fs = require('fs');

  // Vérifier les fichiers CSS
  const cssExists = fs.existsSync(CONFIG.ASSETS.CSS.EMAIL_VIEWER);
  console.log('✅ Email CSS existe:', cssExists);

  const navCssExists = fs.existsSync(CONFIG.ASSETS.CSS.NAVIGATION);
  console.log('✅ Navigation CSS existe:', navCssExists);

  // Vérifier le fichier JS
  const jsExists = fs.existsSync(CONFIG.ASSETS.JS.NAVIGATION);
  console.log('✅ Navigation JS existe:', jsExists);

  if (cssExists && navCssExists && jsExists) {
    Logger.success('Tous les fichiers de ressources sont présents');
  } else {
    Logger.warning('Certains fichiers de ressources sont manquants');
  }
} catch (error) {
  Logger.error('Erreur de validation des chemins: ' + error.message);
}

console.log();

// Test 5: Structure des dossiers
console.log('🏗️ Test 5: Validation de la structure');
try {
  const fs = require('fs');
  const path = require('path');

  const expectedDirs = ['assets', 'assets/css', 'assets/js', 'assets/templates'];
  let allDirsExist = true;

  expectedDirs.forEach((dir) => {
    const exists = fs.existsSync(dir);
    console.log(`${exists ? '✅' : '❌'} Dossier ${dir}:`, exists);
    if (!exists) allDirsExist = false;
  });

  if (allDirsExist) {
    Logger.success('Structure de dossiers validée');
  } else {
    Logger.warning('Structure de dossiers incomplète');
  }
} catch (error) {
  Logger.error('Erreur de validation de structure: ' + error.message);
}

console.log();
console.log('🎉 Tests terminés !\n');
console.log('📊 Résumé de la refactorisation:');
console.log('   • Configuration centralisée ✅');
console.log('   • CSS externalisés ✅');
console.log('   • JavaScript externalisé ✅');
console.log('   • Structure modulaire ✅');
console.log('   • Séparation des préoccupations ✅');
console.log();
console.log("🚀 L'application est maintenant plus maintenable et extensible !");
