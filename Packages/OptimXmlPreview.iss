#define MyAppName "OptimXmlPreview"
#define MyAppVersion "1.0"
#define MyAppPublisher "Votre Entreprise"
#define MyAppURL "https://www.votreentreprise.com/"
#define MyAppExeName "ConvertAndView.bat"

[Setup]
; NOTE: Le nom AppId doit être unique pour chaque application
AppId={{60D3F63D-C9E9-4F6F-A40D-58945D6DF0E7}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Taille approximative de l'installation
OutputDir=.
OutputBaseFilename=OptimXmlPreview_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
; Icône de l'installateur (créez ou trouvez une icône .ico)
; SetupIconFile=icon.ico

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Tous les fichiers JavaScript
Source: "ConvertXmlToHtml.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "UpdateIndex.js"; DestDir: "{app}"; Flags: ignoreversion
; Fichiers batch
Source: "ConvertAndView.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "ConvertOneFile.bat"; DestDir: "{app}"; Flags: ignoreversion
; Fichiers de configuration
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
; Autres fichiers
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
; Créer les dossiers nécessaires
Source: "*"; DestDir: "{app}\Data"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.js,*.bat,*.json,*.md,*.html,*.iss,Output\*,node_modules\*"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Vérifier si Node.js est installé et installer les dépendances
Filename: "cmd.exe"; Parameters: "/c cd ""{app}"" && npm install"; StatusMsg: "Installation des dépendances..."; Flags: runhidden; Check: IsNodeJSInstalled

; Exécuter l'application après l'installation si Node.js est installé
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: IsNodeJSInstalled

[Code]
// Fonction pour vérifier si Node.js est installé
function IsNodeJSInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0);
  
  // Si Node.js n'est pas installé, afficher un message à l'utilisateur
  if not Result then
  begin
    MsgBox('Node.js n''est pas installé sur cet ordinateur.' + #13#10 + 
           'Veuillez installer Node.js depuis https://nodejs.org/' + #13#10 + 
           'avant d''utiliser cette application.', mbInformation, MB_OK);
  end;
end;

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\Output" 