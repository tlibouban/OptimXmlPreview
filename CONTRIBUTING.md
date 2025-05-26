# Contributing to OptimXmlPreview

Nous sommes ravis que vous souhaitiez contribuer à OptimXmlPreview ! Ce document vous guidera à travers le processus de contribution.

## 🚀 Comment contribuer

### Signaler des bugs

1. **Vérifiez** d'abord si le bug n'a pas déjà été signalé dans les [Issues](https://github.com/votre-username/OptimXmlPreview/issues)
2. **Créez une nouvelle issue** avec le template de bug
3. **Décrivez clairement** :
   - Votre environnement (OS, version Node.js)
   - Les étapes pour reproduire le bug
   - Le comportement attendu vs observé
   - Des captures d'écran si applicable

### Proposer des améliorations

1. **Ouvrez une issue** avec le template de feature request
2. **Décrivez** clairement le problème que vous voulez résoudre
3. **Proposez** une solution ou des alternatives
4. **Attendez** la discussion avant de commencer le développement

### Soumettre du code

1. **Fork** le projet
2. **Créez** une branche feature : `git checkout -b feature/ma-super-feature`
3. **Commitez** vos changements : `git commit -m 'feat: ajouter ma super feature'`
4. **Respectez** les conventions de commit (Conventional Commits)
5. **Testez** votre code
6. **Push** vers votre branche : `git push origin feature/ma-super-feature`
7. **Ouvrez** une Pull Request

## 📋 Guidelines de développement

### Style de code

- **ESLint** : Le code doit passer les vérifications ESLint
- **Prettier** : Formatage automatique avec Prettier
- **JSDoc** : Documentez toutes les fonctions publiques
- **Tests** : Ajoutez des tests pour les nouvelles fonctionnalités

### Convention de commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: mise à jour documentation
style: formatage, points-virgules manquants, etc.
refactor: refactoring du code
test: ajout ou modification de tests
chore: maintenance, mise à jour dépendances
```

### Structure du projet

```
OptimXmlPreview/
├── Data/                    # Fichiers XML d'entrée (exemples)
├── Output/                  # Fichiers HTML générés
├── img/                     # Ressources images
├── ConvertXmlToHtml.js     # Module principal de conversion
├── UpdateIndex.js          # Module de mise à jour de l'index
├── index.html              # Interface de navigation
├── ConvertAndView.bat      # Script Windows conversion lot
├── ConvertOneFile.bat      # Script Windows fichier unique
└── README.md               # Documentation
```

## 🧪 Tests

### Lancer les tests

```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

### Écrire des tests

- **Tests unitaires** pour les fonctions utilitaires
- **Tests d'intégration** pour les workflows complets
- **Couverture minimale** : 80% lignes/branches/fonctions

## 🏗️ Environnement de développement

### Prérequis

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/OptimXmlPreview.git
cd OptimXmlPreview

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

### Scripts utiles

```bash
npm run lint          # Vérification ESLint
npm run lint:fix      # Correction automatique ESLint
npm run format        # Formatage Prettier
npm run docs          # Génération documentation
npm run build         # Build pour production
```

## 📝 Documentation

- **README.md** : Documentation principale
- **JSDoc** : Documentation des fonctions dans le code
- **CHANGELOG.md** : Historique des versions
- **Wiki** : Documentation technique approfondie (GitHub Wiki)

## 🤝 Code de conduite

### Nos standards

- **Respect** : Soyez respectueux envers tous les contributeurs
- **Inclusion** : Nous accueillons les contributions de tous
- **Collaboration** : Travaillons ensemble pour améliorer le projet
- **Apprentissage** : Partageons nos connaissances

### Comportements inacceptables

- Propos discriminatoires ou harcelants
- Attaques personnelles
- Spam ou publicité non sollicitée
- Violation de la vie privée

## ❓ Questions

Si vous avez des questions :

1. **Consultez** la documentation existante
2. **Recherchez** dans les issues fermées
3. **Posez** votre question dans une nouvelle issue
4. **Rejoignez** nos discussions GitHub

## 🎯 Priorités actuelles

- [ ] Tests automatisés plus complets
- [ ] Support multi-langues
- [ ] Interface web moderne
- [ ] Export PDF intégré
- [ ] API REST
- [ ] Documentation utilisateur

## 📊 Process de review

### Critères d'acceptation

- ✅ Code fonctionnel et testé
- ✅ Documentation mise à jour
- ✅ Respect des conventions
- ✅ Pas de régression
- ✅ Performance maintenue

### Timeline

- **Review initiale** : 2-3 jours ouvrés
- **Feedback** : Discussion constructive
- **Merge** : Après approbation d'un mainteneur

## 🏆 Reconnaissance

Tous les contributeurs sont reconnus dans :

- **README.md** : Section Contributors
- **CHANGELOG.md** : Mentions des contributions
- **Releases** : Notes de version

Merci de contribuer à OptimXmlPreview ! 🚀

---

**OptimXmlPreview** - Convertisseur d'emails juridiques XML vers HTML  
Licence MIT - Contributions bienvenues ❤️
