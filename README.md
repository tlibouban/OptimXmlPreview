# OptimXmlPreview v2.0

Application de visualisation d'emails eBarreau avec conversion XML vers HTML et interface de navigation moderne.

## 📋 Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Structure des fichiers](#structure-des-fichiers)
- [Configuration](#configuration)
- [Fonctionnalités](#fonctionnalités)
- [Développement](#développement)

## 🎯 Vue d'ensemble

OptimXmlPreview est une application Node.js qui convertit les fichiers XML d'emails juridiques (format eBarreau/RPVA) en fichiers HTML avec une mise en page moderne et responsive. L'application propose deux modes d'utilisation :

- **Mode fichier local** : Conversion et visualisation basique
- **Mode serveur** : Interface complète avec recherche full-text et conversion en temps réel

## 🏗️ Architecture

L'application suit une architecture modulaire avec séparation des préoccupations :

```
OptimXmlPreview/
├── assets/                    # Ressources externalisées
│   ├── css/                   # Feuilles de style
│   │   ├── email-viewer.css           # Styles pour les emails
│   │   └── navigation-interface.css   # Styles pour l'interface
│   ├── js/                    # Scripts JavaScript
│   │   └── navigation-interface.js    # Logique de navigation
│   └── templates/             # Modèles et configuration
│       └── config.js                  # Configuration centralisée
├── ConvertXmlToHtml.js        # Module principal de conversion
├── ConvertXmlToHtml-refactored.js  # Version refactorisée (nouveau)
├── server.js                  # Serveur web avec API
├── index.html                 # Interface de navigation
└── [autres fichiers...]
```

### Principes architecturaux

1. **Séparation des préoccupations** : CSS, JavaScript et configuration externalisés
2. **Configuration centralisée** : Tous les paramètres dans `assets/templates/config.js`
3. **Réutilisabilité** : Modules fonctionnels exportables
4. **Maintenabilité** : Code organisé par fonctionnalité

## 🚀 Installation

### Prérequis
- Node.js (version 16+)
- npm

### Installation rapide
```bash
# Cloner le projet
git clone [URL_DU_PROJET]
cd OptimXmlPreview

# Installer les dépendances
npm install
```

### Installation complète (Windows)
```bash
# Utiliser le script d'installation
InstallOptimXmlPreview.bat
```

## 💻 Utilisation

### Mode serveur (recommandé)

1. **Démarrer le serveur :**
   ```bash
   # Via script Windows
   start_server.bat
   
   # Ou directement
   node server.js
   ```

2. **Accéder à l'interface :**
   - Ouvrir `http://localhost:3000` dans le navigateur
   - Interface complète avec recherche et conversion

### Mode fichier local

1. **Conversion manuelle :**
   ```bash
   # Convertir un fichier spécifique
   node ConvertXmlToHtml.js -o ./Output -s ./Data/email.xml
   
   # Convertir tous les fichiers
   node ConvertXmlToHtml.js -o ./Output -i ./Data
   ```

2. **Ouvrir l'interface :**
   - Double-cliquer sur `index.html`
   - Fonctionnalités limitées (pas de serveur)

## 📁 Structure des fichiers

### Dossiers principaux

- **`Data/`** : Fichiers XML source (emails eBarreau)
- **`Output/`** : Fichiers HTML générés
- **`assets/`** : Ressources externalisées (CSS, JS, config)
- **`img/`** : Images et logos
- **`scripts/`** : Scripts utilitaires
- **`Packages/`** : Packages Node.js

### Fichiers de configuration

- **`assets/templates/config.js`** : Configuration centralisée
- **`package.json`** : Métadonnées et dépendances npm
- **`.gitignore`** : Fichiers à exclure du versioning

### Scripts utilitaires

- **`start_server.bat`** : Démarre le serveur web
- **`ConvertAndView.bat`** : Conversion + ouverture automatique
- **`test_*.bat`** : Scripts de test et validation

## ⚙️ Configuration

### Configuration centralisée (`assets/templates/config.js`)

```javascript
const CONFIG = {
  // Extensions supportées
  SUPPORTED_EXTENSIONS: ['.xml'],
  OUTPUT_FILE_EXTENSION: '.html',
  
  // Chemins des ressources
  ASSETS: {
    CSS: {
      EMAIL_VIEWER: 'assets/css/email-viewer.css',
      NAVIGATION: 'assets/css/navigation-interface.css'
    },
    JS: {
      NAVIGATION: 'assets/js/navigation-interface.js'
    }
  },
  
  // Configuration serveur
  SERVER: {
    DEFAULT_PORT: 3000,
    STATIC_PATHS: {
      OUTPUT: '/Output',
      ASSETS: '/assets',
      IMG: '/img'
    }
  },
  
  // Messages de l'application
  MESSAGES: {
    FOOTER_TEXT: "OptimXmlPreview v2.0 - Visualisation d'emails eBarreau",
    APP_TITLE: "OptimXmlPreview"
  }
};
```

### Variables d'environnement

- **`PORT`** : Port du serveur (défaut: 3000)
- **`NODE_ENV`** : Environnement (development/production)

## ✨ Fonctionnalités

### Interface de navigation

- **Liste des emails** : Tri par date, séparation nouveaux/anciens
- **Recherche full-text** : Dans tous les champs (serveur uniquement)
- **Recherche simple** : Par titre (mode fichier local)
- **Navigation clavier** : Flèches haut/bas
- **Liens externes** : Ouverture dans nouvel onglet

### Conversion d'emails

- **Métadonnées** : Extraction automatique (expéditeur, destinataire, date)
- **Pièces jointes** : Détection et affichage avec icônes
- **Mise en page responsive** : Adaptation mobile/desktop
- **Thème moderne** : CSS avec variables personnalisables

### Mode serveur avancé

- **API REST** : Endpoints pour conversion et recherche
- **Conversion temps réel** : Bouton de conversion intégré
- **Notifications** : Retours visuels pour l'utilisateur
- **Gestion d'erreurs** : Messages informatifs

## 🛠️ Développement

### Structure du code

```javascript
// Module principal refactorisé
const { convertXmlToHtml, CONFIG, Logger } = require('./ConvertXmlToHtml-refactored.js');

// Chargement des ressources externes
const cssContent = loadEmailViewerCSS();
const jsContent = loadNavigationJS();
```

### Ajout de nouvelles fonctionnalités

1. **Nouveau style CSS** : Ajouter dans `assets/css/`
2. **Nouvelle fonctionnalité JS** : Ajouter dans `assets/js/`
3. **Nouvelle configuration** : Modifier `assets/templates/config.js`

### Tests

```bash
# Test des corrections
test_corrections.bat

# Test de la recherche
test_recherche.bat

# Test de conversion
test_conversion.bat
```

### Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📝 Logs et débogage

### Logs de l'application

```javascript
Logger.info('Message informatif');
Logger.success('Opération réussie');
Logger.warning('Avertissement');
Logger.error('Erreur critique');
```

### Débogage

- **Mode développement** : Décommenter les `console.log` dans les fichiers JS
- **Logs serveur** : Vérifier la sortie console du serveur
- **Logs navigateur** : Console développeur du navigateur

## 🔧 Dépannage

### Problèmes courants

**Le serveur ne démarre pas :**
- Vérifier que le port 3000 est libre
- Installer les dépendances : `npm install`

**CSS/JS non chargé :**
- Vérifier les chemins dans `config.js`
- S'assurer que les fichiers existent dans `assets/`

**Erreurs de conversion :**
- Vérifier le format XML des fichiers source
- Consulter les logs pour détails

### Support

- **Documentation** : Voir `CONTRIBUTING.md`
- **Issues** : Utiliser GitHub Issues
- **Changelog** : Voir `CHANGELOG.md`

## 📄 Licence

Voir le fichier `LICENSE` pour les détails de la licence.

---

**OptimXmlPreview v2.0** - Outil moderne de visualisation d'emails juridiques
