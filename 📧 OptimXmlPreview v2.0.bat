@echo off
title OptimXmlPreview v2.0 - Launcher

echo.
echo ================================================================
echo    OptimXmlPreview v2.0 - Launcher automatique complet
echo ================================================================
echo.
echo    Demarrage automatique :
echo    1. Conversion des emails XML
echo    2. Demarrage du serveur
echo    3. Ouverture automatique du navigateur
echo.
echo ================================================================
echo.

REM Etape 1 - Conversion avec le module principal
echo [ETAPE 1/3] Conversion des emails XML...
echo.
node src/convert/ConvertXmlToHtml.js --output ./Output --input-dir ./Data
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ ERREUR: Echec de la conversion des emails XML
    echo    Verifiez que Node.js est installe et que les fichiers XML
    echo    sont presents dans le dossier Data/
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ✅ Conversion terminee avec succes !
echo.

REM Etape 2 - Attendre 2 secondes puis ouvrir le navigateur
echo [ETAPE 2/3] Ouverture automatique du navigateur...
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo ✅ Navigateur lance sur http://localhost:3000
echo.

REM Etape 3 - Demarrer le serveur (en dernier pour que l'interface soit prete)
echo [ETAPE 3/3] Demarrage du serveur OptimXmlPreview...
echo.
echo 🌐 Interface disponible sur: http://localhost:3000
echo 🔄 Le navigateur s'est ouvert automatiquement
echo.
echo ⚠️  IMPORTANT: Gardez cette fenetre ouverte tant que vous utilisez l'application
echo    Appuyez sur Ctrl+C pour arreter le serveur quand vous avez termine
echo.
echo ================================================================
echo.

REM Demarrer le serveur (bloquant)
node server.js

REM Si on arrive ici, c'est que le serveur s'est arrete
echo.
echo 🔴 Serveur arrete.
echo.
pause