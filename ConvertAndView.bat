@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: ====================================================================
:: OptimXmlPreview v2.0 - Script de conversion en lot optimisé
:: Convertit tous les fichiers XML d'un dossier vers HTML avec index
:: ====================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              OptimXmlPreview v2.0 - Conversion XML           ║
echo ║                    Traitement en lot optimisé                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Configuration des chemins
set "DATA_DIR=%~dp0Data"
set "OUTPUT_DIR=%~dp0Output"
set "CONVERT_SCRIPT=%~dp0ConvertXmlToHtml.js"

:: Vérification de Node.js
echo [INFO] Vérification de l'environnement...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERREUR] Node.js n'est pas installé ou non disponible dans PATH
    echo.
    echo Téléchargez et installez Node.js depuis : https://nodejs.org/
    echo Version recommandée : 18.0.0 ou supérieure
    echo.
    goto :error_exit
)

:: Vérification de la version Node.js
for /f "tokens=1" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
echo [OK] Node.js détecté : %NODE_VERSION%

:: Vérification des scripts principaux
if not exist "%CONVERT_SCRIPT%" (
    echo [ERREUR] Script de conversion manquant : %CONVERT_SCRIPT%
    goto :error_exit
)

:: Création des dossiers nécessaires
echo [INFO] Préparation des répertoires...
if not exist "%DATA_DIR%" (
    mkdir "%DATA_DIR%" 2>nul
    echo [CRÉÉ] Dossier Data créé : %DATA_DIR%
)

if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%" 2>nul
    echo [CRÉÉ] Dossier Output créé : %OUTPUT_DIR%
)

:: Vérification des fichiers XML à traiter
echo [INFO] Recherche des fichiers XML...
set "XML_COUNT=0"
for %%f in ("%DATA_DIR%\*.xml") do (
    if exist "%%f" set /a XML_COUNT+=1
)

if %XML_COUNT% equ 0 (
    echo.
    echo [ATTENTION] Aucun fichier XML trouvé dans le dossier Data
    echo.
    echo Placez vos fichiers XML dans : %DATA_DIR%
    echo Puis relancez ce script.
    echo.
    goto :user_exit
)

echo [OK] %XML_COUNT% fichier(s) XML trouvé(s) à traiter

:: Début de la conversion
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    DÉBUT DE LA CONVERSION                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Conversion des fichiers XML
echo [ÉTAPE 1/2] Conversion des fichiers XML vers HTML...

:: Exécuter la conversion et capturer la sortie dans un fichier temporaire
set "TEMP_LOG=%TEMP%\optim_conversion.log"
node "%CONVERT_SCRIPT%" --output "%OUTPUT_DIR%" --input-dir "%DATA_DIR%" --clear-data-folder > "%TEMP_LOG%" 2>&1
set "CONVERT_RESULT=%ERRORLEVEL%"

:: Afficher la sortie de Node.js
type "%TEMP_LOG%"

:: Vérifier si le message de succès est présent dans la sortie
findstr /C:"CONVERSION_SUCCESS" "%TEMP_LOG%" >nul 2>&1
set "SUCCESS_FOUND=%ERRORLEVEL%"

:: Nettoyer le fichier temporaire
del "%TEMP_LOG%" 2>nul

:: Vérifier le succès : soit ERRORLEVEL=0 soit message de succès trouvé
if %CONVERT_RESULT% neq 0 (
    if %SUCCESS_FOUND% neq 0 (
        echo.
        echo [ERREUR] La conversion a échoué (Code d'erreur: %CONVERT_RESULT%)
        echo.
        echo Vérifiez que :
        echo - Les fichiers XML ne sont pas corrompus
        echo - Vous avez les permissions d'écriture dans le dossier Output
        echo - Les dépendances npm sont installées (npm install)
        echo.
        goto :error_exit
    )
)

:: Comptage des fichiers générés
echo.
echo [ÉTAPE 2/2] Vérification des résultats...
set "HTML_COUNT=0"
for %%f in ("%OUTPUT_DIR%\*.html") do (
    if exist "%%f" set /a HTML_COUNT+=1
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                     CONVERSION TERMINÉE                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [RÉSULTAT] %HTML_COUNT% fichier(s) HTML généré(s)
echo [DOSSIER] %OUTPUT_DIR%

:: Ouverture automatique du dossier de sortie
echo.
echo [INFO] Ouverture du dossier des fichiers convertis...
start "" "%OUTPUT_DIR%" 2>nul
:: Réinitialiser ERRORLEVEL après start (peut retourner des codes non critiques)
call :reset_errorlevel

:: Ouverture de la page d'index avec interface de navigation
echo [INFO] Ouverture de l'interface de navigation...
set "INDEX_FILE=%~dp0index.html"
if exist "%INDEX_FILE%" (
    start "" "%INDEX_FILE%" 2>nul
    call :reset_errorlevel
    echo [OK] Interface de navigation ouverte : index.html
) else (
    echo [INFO] Page d'index non trouvée, ouverture du fichier le plus récent...
    :: Trouver et ouvrir le fichier HTML le plus récent
    for /f "delims=" %%a in ('dir /b /od /a-d "%OUTPUT_DIR%\*.html" 2^>nul') do set "LATEST_FILE=%%a"
    if defined LATEST_FILE (
        start "" "%OUTPUT_DIR%\!LATEST_FILE!" 2>nul
        call :reset_errorlevel
        echo [OK] Fichier ouvert : !LATEST_FILE!
    ) else (
        echo [INFO] Aucun fichier HTML trouvé dans Output
    )
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        SUCCÈS !                              ║
echo ║                                                              ║
echo ║  Tous vos emails XML ont été convertis avec succès.          ║
echo ║  Vous pouvez maintenant les consulter dans votre navigateur  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
goto :success_exit

:reset_errorlevel
:: Fonction pour réinitialiser ERRORLEVEL à 0
exit /b 0

:error_exit
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        ÉCHEC                                 ║
echo ║                                                              ║
echo ║  La conversion a échoué. Consultez les messages ci-dessus    ║
echo ║  pour identifier le problème.                                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
exit /b 1

:user_exit
echo Appuyez sur une touche pour fermer...
pause >nul
exit /b 0

:success_exit
echo Appuyez sur une touche pour fermer...
pause >nul
exit /b 0 