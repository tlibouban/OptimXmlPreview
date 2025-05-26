# OptimXmlPreview - Serveur Web Intégré

## 🚀 Nouvelle Fonctionnalité : Conversion Directe

Le projet dispose maintenant d'un **serveur web local** avec conversion directe intégrée !

### ✨ Avantages

- ✅ **Conversion immédiate** via l'interface web
- ✅ **Plus de téléchargement** de scripts batch  
- ✅ **API REST complète** avec endpoints dédiés
- ✅ **Notifications en temps réel** dans l'interface
- ✅ **Rechargement automatique** après conversion
- ✅ **Interface professionnelle** avec serveur Express.js

### 🎯 Démarrage Rapide

#### Option 1 : Script Batch (Recommandé)
```bash
# Double-clic sur le fichier ou exécuter :
start_server.bat
```

#### Option 2 : Ligne de Commande
```bash
# Démarrer le serveur
node server.js

# Ou via npm
npm start
```

### 🌐 Utilisation

1. **Démarrez le serveur** avec `start_server.bat`
2. **Ouvrez votre navigateur** sur http://localhost:3000
3. **Cliquez sur le bouton vert** "Convertir nouveaux emails"
4. **La conversion s'exécute automatiquement** !

### 📡 API Endpoints

| Endpoint       | Méthode | Description             |
| -------------- | ------- | ----------------------- |
| `/`            | GET     | Interface principale    |
| `/api/convert` | POST    | Conversion des emails   |
| `/api/status`  | GET     | Statut de l'application |

### 🔧 Fonctionnalités Techniques

#### Conversion Automatique
- Conversion de tous les fichiers XML du dossier `Data/`
- Génération HTML dans le dossier `Output/`
- Vidage automatique du dossier `Data/` après conversion
- Actualisation automatique de l'interface

#### Interface Améliorée
- **Bouton de conversion** intégré dans l'en-tête
- **Animations de chargement** avec spinner
- **Notifications toast** pour le feedback utilisateur
- **Gestion d'erreurs** complète avec messages explicites

#### Architecture Serveur
- **Express.js** pour le serveur web
- **CORS** activé pour les requêtes cross-origin
- **Gestion d'erreurs** robuste
- **Logs colorés** pour le debugging

### 📁 Structure de Fichiers

```
OptimXmlPreview/
├── server.js              # Serveur web principal
├── start_server.bat       # Script de démarrage rapide
├── ConvertXmlToHtml.js    # Logique de conversion
├── index.html             # Interface générée
├── Data/                  # Fichiers XML source
├── Output/                # Fichiers HTML générés
└── package.json           # Dépendances Node.js
```

### 🎨 Interface Utilisateur

L'interface dispose maintenant d'un **bouton vert** dans l'en-tête :

```
[🔔 OptimXmlPreview] [🔄 Convertir nouveaux emails] [📊 X emails]
```

États du bouton :
- **Repos** : "Convertir nouveaux emails" (vert)
- **Chargement** : "Conversion..." (avec spinner)
- **Succès** : "Conversion réussie !" (avec ✓)
- **Erreur** : "Erreur" (avec ⚠️)

### 🛠️ Dépendances

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "xmldom": "^0.6.0",
  "jsdom": "^24.0.0"
}
```

### 🔍 Debugging

Les logs du serveur affichent :
- ✅ Succès en vert
- ❌ Erreurs en rouge  
- ℹ️ Informations en cyan
- ⚠️ Avertissements en jaune

### 📝 Notes

- Le serveur écoute sur le **port 3000** par défaut
- L'interface est accessible à http://localhost:3000
- Les fichiers statiques sont servis automatiquement
- La conversion inclut le vidage automatique du dossier Data

---

**🎉 Félicitations ! Votre système OptimXmlPreview est maintenant complètement autonome et professionnel !** 