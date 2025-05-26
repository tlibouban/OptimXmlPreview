@echo off
echo.
echo =================================================================
echo                OptimXmlPreview v2.0 - Architecture refactorisee
echo =================================================================
echo.

REM Conversion avec le module refactorise
echo [ETAPE 1] Conversion des emails XML avec module refactorise...
node convert-with-refactored.js
if %ERRORLEVEL% neq 0 (
    echo ERREUR: Echec de la conversion
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [ETAPE 2] Demarrage du serveur simplifie...
echo Interface disponible sur: http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

REM Demarrer le serveur simplifie
node server-simple.js

pause 