@echo off
echo ========================================
echo Test de la Recherche Full-Text
echo ========================================
echo.

echo 1. Démarrage du serveur...
start /B node server.js

echo 2. Attente du démarrage...
timeout /t 3 /nobreak >nul

echo 3. Test de l'API...
curl "http://localhost:3000/api/status"
echo.

echo 4. Ouverture de l'interface...
start "" "http://localhost:3000"

echo.
echo ✅ Interface ouverte !
echo.
echo 🔍 Tests de recherche à effectuer :
echo    - "tribunal" (sujet)
echo    - "dupont" (expéditeur)
echo    - "conclusions" (corps + pièce jointe)
echo    - "pdf" (type de fichier)
echo    - "barreau" (corps du message)
echo.
echo Appuyez sur une touche pour continuer...
pause >nul 