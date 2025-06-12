@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         OptimXmlPreview v2.0 - DÉMONSTRATION INTERFACE       ║
echo ║                 Navigation avec Menu Latéral                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Configuration des chemins
set "DATA_DIR=%~dp0Data"
set "OUTPUT_DIR=%~dp0Output"
set "CONVERT_SCRIPT=%~dp0src\convert\ConvertXmlToHtml.js"

echo [DEMO] Conversion des fichiers XML avec interface de navigation...
echo.

:: Conversion avec génération automatique de l'index
node "%CONVERT_SCRIPT%" --output "%OUTPUT_DIR%" --input-dir "%DATA_DIR%"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   INTERFACE DE NAVIGATION                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ✅ FONCTIONNALITÉS DISPONIBLES :
echo.
echo 📋 Menu latéral avec liste de tous les emails
echo 🔍 Zone de recherche en temps réel
echo 🖱️  Navigation par clic sur les emails
echo ⌨️  Navigation au clavier (flèches ↑↓)
echo 🔗 Ouverture dans nouvel onglet (icône externe)
echo 📱 Interface responsive (mobile/desktop)
echo 🎨 Icônes Font Awesome pour les pièces jointes
echo 🧹 Corps du message nettoyé (sans mentions PJ)
echo.

echo [OUVERTURE] Interface de navigation dans le navigateur...
set "INDEX_FILE=%~dp0index.html"
if exist "%INDEX_FILE%" (
    start "" "%INDEX_FILE%"
    echo [OK] Interface ouverte : %INDEX_FILE%
) else (
    echo [ERREUR] Page d'index non trouvée
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        SUCCÈS !                              ║
echo ║                                                              ║
echo ║  L'interface de navigation est maintenant disponible.        ║
echo ║  Testez toutes les fonctionnalités dans votre navigateur !   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause 