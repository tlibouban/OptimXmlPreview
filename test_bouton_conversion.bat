@echo off
echo ========================================
echo OptimXmlPreview - Test du Bouton de Conversion
echo ========================================
echo.
echo 1. Ajout d'un fichier XML de test...
copy NUL "Data\demo_test_%time:~0,2%%time:~3,2%%time:~6,2%.xml" >nul 2>&1

echo 2. Ouverture de l'interface...
start "" "index.html"

echo 3. Instructions :
echo    - Cliquez sur le bouton vert "Convertir nouveaux emails"
echo    - Un fichier "convertir-emails.bat" sera téléchargé
echo    - Exécutez ce fichier pour lancer la conversion automatique
echo.
echo ✓ Interface ouverte - Testez le bouton de conversion !
pause 