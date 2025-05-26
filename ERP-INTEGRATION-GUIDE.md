# 🏢 Guide d'Intégration ERP - OptimXmlPreview v2.1

## Intégration système ERP professionnel

---

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Installation et configuration](#-installation-et-configuration)
- [Utilisation](#-utilisation)
- [Configuration avancée](#-configuration-avancée)
- [API et formats](#-api-et-formats)
- [Déploiement](#-déploiement)

---

## 🎯 Vue d'ensemble

L'intégration ERP d'**OptimXmlPreview v2.1** permet l'envoi automatique des documents HTML convertis vers des systèmes ERP externes via API REST avec gestion d'erreurs robuste et mode dégradé.

### Fonctionnalités clés
- ✅ **Envoi automatique** vers ERP après conversion
- ✅ **Retry intelligent** avec backoff exponentiel
- ✅ **Mode dégradé** si ERP indisponible
- ✅ **Support multi-ERP** (SAP, Sage, Odoo, Custom)
- ✅ **Sécurité renforcée** avec gestion des secrets

---

## ⚡ Installation et configuration

### Configuration minimale
```bash
# Copier et éditer la configuration
cp config.env.example .env
nano .env
```

### Variables d'environnement essentielles
```bash
# Configuration ERP de base
ERP_BASE_URL=https://api.votre-erp.com/v1
ERP_API_KEY=your-secret-api-key-here
ERP_ENABLED=true
ERP_TIMEOUT=30000
```

### Test de connexion
```bash
# Valider la configuration
node test-erp-integration.js --real
```

---

## 🎮 Utilisation

### Intégration automatique
Modifiez votre processus de conversion existant :

```javascript
const { integrateWithERP } = require('./erp-integration.js');

// Après conversion HTML
async function convertAndSendToERP(xmlContent, outputPath) {
  // Conversion standard
  const result = await convertXmlToHtml(xmlContent, outputPath);
  
  // Intégration ERP si activée
  if (process.env.ERP_ENABLED === 'true') {
    const erpResult = await integrateWithERP(outputPath, result.metadata);
    
    if (erpResult.success) {
      Logger.success(`Document envoyé vers ERP: ${erpResult.documentId}`);
    } else {
      Logger.warning(`Mode dégradé: ${erpResult.error}`);
    }
  }
  
  return result;
}
```

### Utilisation directe
```javascript
const { ERPIntegrationClient } = require('./erp-integration.js');

const client = new ERPIntegrationClient();

// Envoi manuel vers ERP
const result = await client.uploadDocument('./Output/email.html', {
  subject: 'Email important',
  from: 'expediteur@domaine.com',
  attachmentCount: 2
});

Logger.info(`Résultat: ${result.message}`);
```

---

## ⚙️ Configuration avancée

### Configuration par ERP

#### SAP
```bash
ERP_BASE_URL=https://sap.yourcompany.com/sap/opu/odata/sap
ERP_API_KEY=your-sap-token
ERP_AUTH_TYPE=oauth2
ERP_TIMEOUT=60000
ERP_MAX_RETRIES=5
```

#### Sage
```bash
ERP_BASE_URL=https://api.sage.com/v3.1
ERP_API_KEY=your-sage-api-key
ERP_AUTH_TYPE=bearer
ERP_TIMEOUT=30000
ERP_MAX_RETRIES=3
```

#### Odoo
```bash
ERP_BASE_URL=https://yourcompany.odoo.com/api/v1
ERP_API_KEY=your-odoo-api-key
ERP_AUTH_TYPE=bearer
ERP_TIMEOUT=30000
ERP_MAX_RETRIES=3
```

### Configuration personnalisée
```javascript
const customConfig = {
  BASE_URL: 'https://api.custom-erp.com/v2',
  API_KEY: 'custom-secret-key',
  TIMEOUT: 45000,
  MAX_RETRIES: 5,
  RETRY_DELAY: 2000
};

const client = new ERPIntegrationClient(customConfig);
```

---

## 📡 API et formats

### Payload envoyé
```json
{
  "document": {
    "filename": "email-converted.html",
    "content": "base64-encoded-html-content",
    "contentType": "text/html",
    "size": 12345
  },
  "metadata": {
    "source": "OptimXmlPreview",
    "version": "2.1.0",
    "timestamp": "2025-01-26T16:30:00.000Z",
    "emailSubject": "Notification RPVA",
    "emailFrom": "tribunal@justice.fr",
    "emailTo": "avocat@cabinet.com",
    "attachmentCount": 2,
    "conversionDate": "2025-01-26T16:30:00.000Z"
  }
}
```

### Réponse ERP attendue
```json
{
  "success": true,
  "documentId": "doc_1234567890_abc123",
  "status": "uploaded",
  "message": "Document envoyé avec succès",
  "timestamp": "2025-01-26T16:30:00.000Z"
}
```

### Gestion d'erreurs
```javascript
// Mode dégradé automatique
const result = await integrateWithERP(htmlFile, metadata);

if (!result.success && result.mode === 'degraded') {
  // Application continue, ERP indisponible
  Logger.warning('Mode dégradé activé');
}
```

---

## 🔧 Dépannage

### Erreurs courantes

| Erreur                     | Cause                   | Solution                |
| -------------------------- | ----------------------- | ----------------------- |
| `ERP_BASE_URL requis`      | Configuration manquante | Définir `ERP_BASE_URL`  |
| `HTTP 401: Unauthorized`   | API Key invalide        | Vérifier `ERP_API_KEY`  |
| `HTTP 404: Not Found`      | Endpoint incorrect      | Vérifier URL endpoints  |
| `Timeout`                  | ERP trop lent           | Augmenter `ERP_TIMEOUT` |
| `Échec après X tentatives` | ERP indisponible        | Vérifier connectivité   |

### Mode debug
```bash
# Logs détaillés
ERP_LOG_LEVEL=debug
ERP_LOG_REQUESTS=true

# Test de connectivité
node test-erp-integration.js --debug
```

---

## 🚀 Déploiement

### Environnement de production
```bash
# Variables sécurisées
export ERP_BASE_URL="https://prod-erp.company.com/api/v1"
export ERP_API_KEY="prod-secret-key"
export ERP_ENABLED="true"
export ERP_TIMEOUT="30000"

# Lancement application
npm start
```

### Conteneurisation Docker
```dockerfile
FROM node:18-alpine

# Variables ERP
ENV ERP_BASE_URL=https://api.erp.com/v1
ENV ERP_ENABLED=true
ENV ERP_TIMEOUT=30000

WORKDIR /app
COPY . .
RUN npm install --production

CMD ["npm", "start"]
```

### Monitoring et métriques
- **Taux de succès** des envois ERP
- **Temps de réponse** moyen
- **Nombre de retry** par envoi
- **Volume** de documents traités

---

## 🔒 Sécurité

### Bonnes pratiques
- **🔐 Secrets manager** : Jamais de clés API dans le code
- **🔒 HTTPS obligatoire** : Chiffrement des communications
- **🔄 Rotation des clés** : Renouvellement périodique
- **📝 Logs sécurisés** : Aucune donnée sensible loggée
- **⏱️ Timeouts appropriés** : Éviter les blocages

### Variables sensibles
```bash
# ❌ À ne JAMAIS committer
ERP_API_KEY=super-secret-key
ERP_CLIENT_SECRET=another-secret

# ✅ Utiliser en production
export ERP_API_KEY="$(aws secretsmanager get-secret-value...)"
```

---

## 📞 Support

### Débogage étape par étape
1. **Test connectivité** : `node test-erp-integration.js --real`
2. **Logs debug** : `ERP_LOG_LEVEL=debug npm start`
3. **Test manuel** : `curl` ou Postman
4. **Vérification ERP** : Configuration côté serveur

### Contact
- **📧 Support technique** : support@optimxmlpreview.com
- **🐛 Issues GitHub** : Signaler bugs et demandes
- **📚 Documentation** : Wiki technique complet

---

<div align="center">

**🏢 Intégration ERP OptimXmlPreview v2.1**  
*Conversion d'emails avec envoi automatique vers ERP*

[← Retour README](README.md) • [🏗️ Architecture](ARCHITECTURE.md) • [🤝 Contribuer](CONTRIBUTING.md)

</div>
