@echo off
chcp 65001 >nul
echo ===================================
echo  Installation de OptimXmlPreview
echo ===================================
echo.

set INSTALL_DIR=%PROGRAMFILES%\OptimXmlPreview

echo Installation dans %INSTALL_DIR%
echo.

:: Créer le répertoire d'installation
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\Data" mkdir "%INSTALL_DIR%\Data"
if not exist "%INSTALL_DIR%\Output" mkdir "%INSTALL_DIR%\Output"

:: Copier les fichiers
echo Copie des fichiers...
copy OptimXmlPreview.exe "%INSTALL_DIR%\"
copy index.html "%INSTALL_DIR%\"
copy README.md "%INSTALL_DIR%\"

:: Créer un raccourci sur le bureau
echo Création du raccourci sur le bureau...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\OptimXmlPreview.lnk');$s.TargetPath='%INSTALL_DIR%\OptimXmlPreview.exe';$s.Save()"

:: Créer un raccourci dans le menu Démarrer
echo Création du raccourci dans le menu Démarrer...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\OptimXmlPreview.lnk');$s.TargetPath='%INSTALL_DIR%\OptimXmlPreview.exe';$s.Save()"

echo.
echo Installation terminée avec succès!
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul 