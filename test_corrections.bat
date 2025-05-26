@echo off
echo ========================================
echo Test des Corrections OptimXmlPreview
echo ========================================
echo.

echo 1. Test du serveur...
curl http://localhost:3000/api/status
echo.
echo.

echo 2. Test de l'API de recherche...
curl "http://localhost:3000/api/search?q=tribunal"
echo.
echo.

echo 3. Ouverture de l'interface serveur...
start "" "http://localhost:3000"
echo ✅ Interface serveur ouverte (recherche full-text active)
echo.

echo 4. Ouverture de l'interface fichier local...
start "" "index.html"
echo ✅ Interface fichier local ouverte (recherche simple)
echo.

echo ========================================
echo Tests à effectuer manuellement :
echo ========================================
echo.
echo 🔍 RECHERCHE (mode serveur) :
echo    - Tapez "tribunal" → Devrait trouver avec badges
echo    - Tapez "dupont" → Devrait trouver dans expéditeur
echo    - Tapez "pdf" → Devrait trouver les pièces jointes
echo.
echo 🔍 RECHERCHE (mode fichier local) :
echo    - Recherche limitée au titre seulement
echo    - Message informatif dans placeholder
echo.
echo 🔄 CONVERSION (mode serveur) :
echo    - Bouton vert actif et fonctionnel
echo.
echo 🔄 CONVERSION (mode fichier local) :
echo    - Bouton grisé avec "Serveur requis"
echo.
echo 📄 FOOTER :
echo    - Texte : "OptimXmlPreview v2.0 - Visualisation d'emails eBarreau"
echo    - Logo CNB affiché si présent
echo.
echo 🎨 FAVICON :
echo    - Icône "img/icon-com.svg" dans l'onglet
echo.
echo Appuyez sur une touche pour fermer...
pause >nul 