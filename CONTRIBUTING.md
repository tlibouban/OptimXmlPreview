# 🤝 Guide de Contribution - OptimXmlPreview v2.0

## Standards de développement et bonnes pratiques

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Standards de développement](#-standards-de-développement)
- [Workflow de contribution](#-workflow-de-contribution)
- [Structure du projet](#-structure-du-projet)
- [Tests et qualité](#-tests-et-qualité)
- [Documentation](#-documentation)

---

## 🎯 Vue d'ensemble

Nous accueillons toutes les contributions à **OptimXmlPreview v2.0** ! Ce guide établit les standards de qualité et les processus pour maintenir la cohérence du projet.

### Principes de contribution
- **📋 Qualité** : Code propre, testé et documenté
- **🔄 Cohérence** : Respect des conventions établies
- **🤝 Collaboration** : Communication respectueuse et constructive
- **🚀 Innovation** : Propositions d'amélioration bienvenues

---

## 💻 Standards de développement

### Technologies utilisées
- **Runtime** : Node.js v18+
- **Serveur** : Express.js
- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **Tests** : Jest
- **Linting** : ESLint + Prettier

### Standards de code

#### JavaScript
```javascript
// ✅ Bonnes pratiques
const CONFIG = require('./assets/templates/config.js');

async function convertXmlToHtml(xmlContent, outputPath) {
  try {
    // Logique claire et commentée
    const result = await processXml(xmlContent);
    Logger.success('Conversion réussie');
    return result;
  } catch (error) {
    Logger.error(`Erreur conversion: ${error.message}`);
    throw error;
  }
}

// ✅ Exports explicites
module.exports = {
  convertXmlToHtml,
  CONFIG,
  Logger
};
```

#### CSS
```css
/* ✅ Variables CSS et structure cohérente */
:root {
  --primary-color: #141325;
  --accent-color: #4CAF50;
  --text-color: #333;
}

.email-container {
  padding: var(--spacing-md);
  color: var(--text-color);
  font-family: var(--font-primary);
}
```

#### HTML
```html
<!-- ✅ Structure sémantique et accessible -->
<main class="email-viewer" role="main">
  <header class="email-header">
    <h1 class="email-subject">{{ subject }}</h1>
  </header>
  <section class="email-content">
    <!-- Contenu email -->
  </section>
</main>
```

---

## 🔄 Workflow de contribution

### 1. Préparation
```bash
# Fork et clone du projet
git clone https://github.com/[votre-username]/OptimXmlPreview.git
cd OptimXmlPreview

# Installation dépendances
npm install

# Vérification environnement
npm run test
npm run lint
```

### 2. Développement
```bash
# Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# Développement avec tests
npm run test:watch

# Validation continue
npm run lint:fix
```

### 3. Conventions Git

#### Messages de commit
```bash
# Format : type(scope): description

# Types autorisés
feat(server): ajout endpoint API conversion temps réel
fix(css): correction responsive design email-viewer
docs(readme): mise à jour guide installation
style(css): harmonisation variables couleurs
refactor(core): externalisation configuration
test(convert): ajout tests conversion XML complexe
chore(deps): mise à jour dépendances sécurité
```

#### Workflow branches
- **`main`** : Code production stable
- **`develop`** : Intégration features (si applicable)
- **`feature/*`** : Nouvelles fonctionnalités
- **`hotfix/*`** : Corrections urgentes
- **`docs/*`** : Améliorations documentation

### 4. Pull Request
```markdown
## 📋 Description
Résumé de la fonctionnalité/correction

## ✨ Changements
- [ ] Nouvelle fonctionnalité X
- [ ] Correction bug Y
- [ ] Amélioration performance Z

## 🧪 Tests
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Tests d'intégration validés
- [ ] Tests manuels effectués

## 📚 Documentation
- [ ] README mis à jour si nécessaire
- [ ] JSDoc ajouté pour nouvelles fonctions
- [ ] CHANGELOG mis à jour
```

---

## 🗂️ Structure du projet

### Organisation des fichiers
```
OptimXmlPreview/
├── 📁 assets/                    # Ressources frontend
│   ├── css/                      # Styles modulaires
│   ├── js/                       # Scripts client
│   └── templates/                # Configuration
├── 📁 tests/                     # Tests automatisés
│   ├── unit/                     # Tests unitaires
│   ├── integration/              # Tests d'intégration
│   └── fixtures/                 # Données de test
├── 📁 docs/                      # Documentation
└── 📁 scripts/                   # Scripts utilitaires
```

### Conventions de nommage
- **Fichiers** : `kebab-case.js` (ex: `email-viewer.css`)
- **Fonctions** : `camelCase` (ex: `convertXmlToHtml`)
- **Constantes** : `UPPER_SNAKE_CASE` (ex: `CONFIG.SERVER.PORT`)
- **Classes CSS** : `kebab-case` (ex: `.email-container`)

---

## 🧪 Tests et qualité

### Types de tests
```bash
# Tests unitaires (obligatoires)
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests E2E (si applicable)
npm run test:e2e

# Couverture de code
npm run test:coverage
```

### Exigences qualité
- **Couverture minimale** : 80% (branches, fonctions, lignes)
- **Linting** : 0 erreur ESLint
- **Performance** : Pas de régression significative
- **Documentation** : JSDoc pour toutes fonctions publiques

### Exemple test unitaire
```javascript
// tests/unit/convert.test.js
const { convertXmlToHtml, extractEmailMetadata } = require('../../ConvertXmlToHtml.js');

describe('ConvertXmlToHtml', () => {
  test('devrait extraire les métadonnées email', () => {
    const xmlContent = '<email><subject>Test</subject></email>';
    const metadata = extractEmailMetadata(xmlContent);
    
    expect(metadata.subject).toBe('Test');
    expect(metadata.date).toBeDefined();
  });
  
  test('devrait gérer les erreurs XML malformé', () => {
    const invalidXml = '<email><subject>Unclosed tag';
    
    expect(() => {
      extractEmailMetadata(invalidXml);
    }).toThrow('XML malformé');
  });
});
```

---

## 📚 Documentation

### Standards documentation

#### JSDoc
```javascript
/**
 * Convertit un fichier XML email en HTML formaté
 * @param {string} xmlContent - Contenu XML source
 * @param {string} outputPath - Chemin de sortie HTML
 * @param {Object} options - Options de conversion
 * @param {boolean} options.includeAttachments - Inclure pièces jointes
 * @returns {Promise<Object>} Résultat conversion avec métadonnées
 * @throws {Error} Si XML malformé ou erreur IO
 * @example
 * const result = await convertXmlToHtml(xmlData, './output.html', {
 *   includeAttachments: true
 * });
 */
async function convertXmlToHtml(xmlContent, outputPath, options = {}) {
  // Implémentation...
}
```

#### README sections requises
- **Installation** : Prérequis et étapes
- **Utilisation** : Exemples concrets
- **API** : Documentation fonctions publiques
- **Configuration** : Options disponibles
- **Dépannage** : Problèmes courants

### Mise à jour CHANGELOG
```markdown
## [2.1.0] - 2025-01-26

### ✨ Nouvelles fonctionnalités
- Intégration ERP via API REST
- Interface de conversion temps réel

### 🐛 Corrections
- Correction extraction contenu XML `<body>`
- Amélioration gestion erreurs serveur

### 🔄 Améliorations
- Performance conversion +50%
- Interface responsive optimisée
```

---

## 🎯 Priorités de développement

### Version actuelle (v2.0)
- ✅ Architecture modulaire stable
- ✅ Interface web complète
- ✅ Conversion XML→HTML robuste

### Prochaines versions
- **v2.1** : Intégration ERP
- **v2.2** : Multi-thèmes
- **v2.3** : API REST étendue
- **v3.0** : Architecture cloud

### Contributions recherchées
- 🔧 **Tests automatisés** : Augmenter couverture
- 🎨 **Thèmes** : Nouveaux designs CSS
- 🌍 **Internationalisation** : Support multilingue
- 📱 **Mobile** : Optimisations PWA
- ⚡ **Performance** : Optimisations algorithmes

---

## 💬 Support et assistance

### Canaux de communication
- **🐛 Issues GitHub** : Bugs et demandes de fonctionnalités
- **💬 Discussions** : Questions et échanges techniques
- **📧 Email** : contact@optimxmlpreview.com
- **📖 Wiki** : Documentation technique étendue

### Processus de review
1. **Review automatique** : Tests CI/CD passent
2. **Review technique** : Code conforme aux standards
3. **Review fonctionnelle** : Fonctionnalité validée
4. **Merge** : Après approbation mainteneur

---

<div align="center">

**🤝 Contribuer à OptimXmlPreview v2.0**  
*Ensemble, créons le meilleur outil de conversion d'emails juridiques*

[← Retour README](README.md) • [🏗️ Architecture](ARCHITECTURE.md) • [📋 Issues](https://github.com/votre-org/OptimXmlPreview/issues)

</div>

---

**OptimXmlPreview** - Convertisseur d'emails juridiques XML vers HTML  
Licence MIT - Contributions bienvenues ❤️
