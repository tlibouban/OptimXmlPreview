@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: ====================================================================
:: OptimXmlPreview v2.0 - Script de conversion fichier unique
:: Convertit un fichier XML spécifique vers HTML (glisser-déposer)
:: ====================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              OptimXmlPreview v2.0 - Visualisation           ║
echo ║                     Fichier unique optimisé                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Configuration des chemins
set "OUTPUT_DIR=%~dp0Output"
set "CONVERT_SCRIPT=%~dp0ConvertXmlToHtml.js"
set "SOURCE_FILE=%~1"

:: Vérification du fichier fourni en paramètre
echo [INFO] Vérification du fichier fourni...
if "%SOURCE_FILE%"=="" (
    echo.
    echo [ERREUR] Aucun fichier fourni en paramètre
    echo.
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║                     MODE D'UTILISATION                    ║
    echo ║                                                            ║
    echo ║  Pour utiliser ce script :                                ║
    echo ║  1. Glissez-déposez un fichier XML sur cette icône        ║
    echo ║  2. Ou exécutez : ConvertOneFile.bat "chemin\fichier.xml" ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    goto :user_exit
)

:: Vérification de l'existence du fichier
if not exist "%SOURCE_FILE%" (
    echo [ERREUR] Le fichier spécifié n'existe pas : %SOURCE_FILE%
    echo.
    goto :error_exit
)

:: Vérification de l'extension XML
for %%i in ("%SOURCE_FILE%") do set "FILE_EXT=%%~xi"
if /i not "%FILE_EXT%"==".xml" (
    echo.
    echo [ERREUR] Le fichier doit avoir l'extension .xml
    echo.
    echo Fichier fourni : %~nx1
    echo Extension détectée : %FILE_EXT%
    echo Extension requise : .xml
    echo.
    goto :error_exit
)

:: Affichage des informations du fichier
for %%i in ("%SOURCE_FILE%") do (
    set "FILE_NAME=%%~nxi"
    set "FILE_SIZE=%%~zi"
    set "FILE_PATH=%%~fi"
)

echo [OK] Fichier XML valide détecté
echo [FICHIER] %FILE_NAME%
echo [TAILLE] %FILE_SIZE% octets
echo [CHEMIN] %FILE_PATH%

:: Vérification de Node.js
echo.
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

:: Vérification du script de conversion
if not exist "%CONVERT_SCRIPT%" (
    echo [ERREUR] Script de conversion manquant : %CONVERT_SCRIPT%
    echo.
    echo Assurez-vous que le fichier ConvertXmlToHtml.js est présent
    echo dans le même dossier que ce script batch.
    echo.
    goto :error_exit
)

:: Création du dossier Output s'il n'existe pas
echo [INFO] Préparation du répertoire de sortie...
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%" 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [ERREUR] Impossible de créer le dossier Output
        goto :error_exit
    )
    echo [CRÉÉ] Dossier Output créé : %OUTPUT_DIR%
) else (
    echo [OK] Dossier Output existant : %OUTPUT_DIR%
)

:: Début de la conversion
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    DÉBUT DE LA CONVERSION                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [ÉTAPE 1/2] Conversion du fichier XML vers HTML...
echo [SOURCE] %FILE_NAME%

:: Exécution de la conversion avec gestion d'erreur détaillée
node "%CONVERT_SCRIPT%" --output "%OUTPUT_DIR%" --source-file "%SOURCE_FILE%"
set "CONVERSION_RESULT=%ERRORLEVEL%"

if %CONVERSION_RESULT% neq 0 (
    echo.
    echo [ERREUR] La conversion a échoué (Code d'erreur: %CONVERSION_RESULT%)
    echo.
    echo Causes possibles :
    echo - Le fichier XML est corrompu ou mal formé
    echo - Permissions insuffisantes pour écrire dans le dossier Output
    echo - Dépendances Node.js manquantes (exécutez 'npm install')
    echo - Erreur de parsing du contenu XML
    echo.
    goto :error_exit
)

:: Vérification du fichier HTML généré
echo [ÉTAPE 2/2] Vérification du résultat...
for %%i in ("%SOURCE_FILE%") do set "HTML_NAME=%%~ni.html"
set "HTML_PATH=%OUTPUT_DIR%\%HTML_NAME%"

if not exist "%HTML_PATH%" (
    echo [ERREUR] Le fichier HTML n'a pas été généré : %HTML_NAME%
    goto :error_exit
)

:: Obtention de la taille du fichier généré
for %%i in ("%HTML_PATH%") do set "HTML_SIZE=%%~zi"

echo [OK] Fichier HTML généré avec succès
echo [FICHIER] %HTML_NAME%
echo [TAILLE] %HTML_SIZE% octets
echo [CHEMIN] %HTML_PATH%

:: Ouverture automatique dans le navigateur
echo.
echo [INFO] Ouverture du fichier dans le navigateur par défaut...
start "" "%HTML_PATH%" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ATTENTION] Impossible d'ouvrir automatiquement le fichier
    echo Vous pouvez l'ouvrir manuellement : %HTML_PATH%
) else (
    echo [OK] Fichier ouvert avec succès dans le navigateur
)

:: Message de succès
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        SUCCÈS !                             ║
echo ║                                                              ║
echo ║  Votre email XML a été converti avec succès en HTML.        ║
echo ║  Le fichier s'est ouvert automatiquement dans votre         ║
echo ║  navigateur par défaut.                                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

goto :success_exit

:error_exit
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        ÉCHEC                                ║
echo ║                                                              ║
echo ║  La conversion a échoué. Consultez les messages ci-dessus   ║
echo ║  pour identifier et résoudre le problème.                   ║
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