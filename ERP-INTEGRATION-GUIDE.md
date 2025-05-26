# 🏢 Guide d'Intégration ERP - OptimXmlPreview v2.1

## 📋 Vue d'ensemble

Cette fonctionnalité permet d'envoyer automatiquement les documents HTML convertis vers un système ERP externe via des API REST. Elle inclut :

- ✅ **Gestion d'erreurs robuste** avec retry automatique
- ✅ **Mode dégradé** si l'ERP n'est pas accessible 
- ✅ **Configuration flexible** via variables d'environnement
- ✅ **Logging détaillé** pour le débogage
- ✅ **Support multi-ERP** (SAP, Sage, Odoo, Custom)

## 🚀 Installation et Configuration

### 1. **Configuration de base**

```bash
# Copier la configuration exemple
cp config.env.example .env

# Éditer la configuration
nano .env
```

### 2. **Variables d'environnement essentielles**

```bash
# Configuration minimale
ERP_BASE_URL=https://api.votre-erp.com/v1
ERP_API_KEY=your-secret-api-key-here
ERP_ENABLED=true
```

### 3. **Test de connexion**

```bash
# Tester la configuration
node test-erp-integration.js --real
```

## 🔧 Utilisation

### **Méthode 1: Intégration automatique**

Modifiez `ConvertXmlToHtml.js` pour inclure l'envoi ERP après conversion :

```javascript
const { integrateWithERP } = require('./erp-integration.js');

// Après la conversion HTML
async function convertXmlToHtml(xmlContent, outputHtmlPath, sourceFilePath, outputDir) {
  // ... conversion existante ...
  
  // Intégration ERP (optionnelle)
  if (process.env.ERP_ENABLED === 'true') {
    const erpResult = await integrateWithERP(outputHtmlPath, metadata);
    
    if (erpResult.success) {
      console.log(`✅ Document envoyé vers ERP: ${erpResult.documentId}`);
    } else {
      console.warn(`⚠️ ERP non accessible: ${erpResult.error}`);
    }
  }
  
  return true;
}
```

### **Méthode 2: Utilisation manuelle**

```javascript
const { ERPIntegrationClient } = require('./erp-integration.js');

const client = new ERPIntegrationClient();

// Envoyer un document
const result = await client.uploadDocument('./Output/email.html', {
  subject: 'Email important',
  from: 'sender@example.com',
  attachmentCount: 3
});

console.log(result);
```

## 📊 Formats de Données

### **Payload envoyé à l'ERP**

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
    "version": "2.0.0",
    "timestamp": "2025-01-26T16:30:00.000Z",
    "originalFormat": "XML",
    "convertedFormat": "HTML",
    "emailSubject": "Notification RPVA",
    "emailFrom": "tribunal@justice.fr",
    "emailTo": "avocat@cabinet.com",
    "attachmentCount": 2,
    "sourceFile": "/path/to/original.xml",
    "conversionDate": "2025-01-26T16:30:00.000Z"
  }
}
```

### **Réponse de l'ERP**

```json
{
  "success": true,
  "documentId": "doc_1234567890_abc123",
  "status": "uploaded",
  "message": "Document envoyé avec succès",
  "timestamp": "2025-01-26T16:30:00.000Z"
}
```

## 🔧 Configuration Avancée

### **Authentification personnalisée**

```javascript
const customConfig = {
  BASE_URL: 'https://api.custom-erp.com/v2',
  API_KEY: 'custom-key',
  TIMEOUT: 45000,
  MAX_RETRIES: 5,
  RETRY_DELAY: 2000
};

const client = new ERPIntegrationClient(customConfig);
```

### **Headers personnalisés**

```javascript
// Surcharger fetchWithRetry pour des headers spéciaux
class CustomERPClient extends ERPIntegrationClient {
  async fetchWithRetry(url, options = {}, attempt = 1) {
    options.headers = {
      ...options.headers,
      'X-Custom-Header': 'value',
      'X-Client-Version': '2.1.0'
    };
    
    return super.fetchWithRetry(url, options, attempt);
  }
}
```

## 🎯 Exemples par ERP

### **SAP**

```bash
ERP_BASE_URL=https://sap.yourcompany.com/sap/opu/odata/sap
ERP_API_KEY=your-sap-token
ERP_AUTH_TYPE=oauth2
ERP_TIMEOUT=60000
```

### **Sage**

```bash
ERP_BASE_URL=https://api.sage.com/v3.1
ERP_API_KEY=your-sage-api-key
ERP_AUTH_TYPE=bearer
ERP_TIMEOUT=30000
```

### **Odoo**

```bash
ERP_BASE_URL=https://yourcompany.odoo.com/api/v1
ERP_API_KEY=your-odoo-api-key
ERP_AUTH_TYPE=bearer
ERP_TIMEOUT=30000
```

## 🛠️ Développement et Tests

### **Tests unitaires**

```bash
# Tests hors ligne (mocks)
node test-erp-integration.js

# Tests avec ERP réel
node test-erp-integration.js --real
```

### **Mode debug**

```bash
# Activer les logs détaillés
ERP_LOG_LEVEL=debug
ERP_LOG_REQUESTS=true
```

### **Développement local**

1. **Créer un mock server** pour tester sans ERP réel
2. **Utiliser ngrok** pour exposer votre API locale
3. **Tester avec Postman** ou équivalent

## 🚨 Gestion d'Erreurs

### **Erreurs courantes**

| Erreur                     | Cause                   | Solution                  |
| -------------------------- | ----------------------- | ------------------------- |
| `ERP_BASE_URL est requis`  | Configuration manquante | Définir `ERP_BASE_URL`    |
| `Échec après X tentatives` | ERP inaccessible        | Vérifier connectivité/URL |
| `HTTP 401: Unauthorized`   | API Key invalide        | Vérifier `ERP_API_KEY`    |
| `HTTP 404: Not Found`      | Endpoint incorrect      | Vérifier les endpoints    |
| `Timeout`                  | ERP trop lent           | Augmenter `ERP_TIMEOUT`   |

### **Mode dégradé**

Le système continue de fonctionner même si l'ERP est inaccessible :

```javascript
const result = await integrateWithERP(htmlFile, metadata);

if (!result.success && result.mode === 'degraded') {
  console.warn('⚠️ Mode dégradé: conversion OK, ERP indisponible');
  // L'application continue normalement
}
```

## 📈 Monitoring et Logging

### **Logs disponibles**

```bash
🔍 Test de connexion à l'ERP...
✅ Connexion ERP OK
📤 Envoi vers ERP: email-converted.html
✅ Document envoyé avec succès. ID: doc_123456789
❌ Tentative 1/3 échouée: HTTP 500: Internal Server Error
🔄 Nouvelle tentative dans 1000ms...
⚠️ Mode dégradé: ERP non accessible
```

### **Métriques recommandées**

- ✅ **Taux de succès** des envois ERP
- ⏱️ **Temps de réponse** moyen de l'ERP
- 🔄 **Nombre de retry** par envoi
- 📊 **Volume** de documents envoyés

## 🔒 Sécurité

### **Bonnes pratiques**

1. **Jamais de clés API** dans le code source
2. **Utiliser HTTPS** obligatoirement
3. **Rotation des clés** API régulière
4. **Logs sans données sensibles**
5. **Timeout approprié** pour éviter les blocages

### **Variables sensibles**

```bash
# À ne JAMAIS committer
ERP_API_KEY=super-secret-key
ERP_CLIENT_SECRET=another-secret

# Utiliser des secrets manager en production
```

## 🚀 Déploiement

### **Production**

```bash
# Variables d'environnement
export ERP_BASE_URL="https://prod-erp.company.com/api/v1"
export ERP_API_KEY="prod-api-key"
export ERP_ENABLED="true"
export ERP_TIMEOUT="30000"

# Lancer l'application
npm start
```

### **Docker**

```dockerfile
# Dockerfile
ENV ERP_BASE_URL=https://api.erp.com/v1
ENV ERP_ENABLED=true
ENV ERP_TIMEOUT=30000
```

## 📞 Support et Troubleshooting

### **Débug pas à pas**

1. **Tester la connectivité** : `node test-erp-integration.js --real`
2. **Vérifier les logs** : activer `ERP_LOG_LEVEL=debug`
3. **Tester manuellement** : utiliser `curl` ou Postman
4. **Vérifier la configuration** ERP côté serveur

### **Contact**

- 📧 **Email** : support@optimxmlpreview.com  
- 🐛 **Issues** : GitHub Issues
- 📚 **Documentation** : Wiki du projet

---

**OptimXmlPreview v2.1** - Conversion XML vers HTML avec intégration ERP professionnelle 🏢 