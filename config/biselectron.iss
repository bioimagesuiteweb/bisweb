[Setup]
AppVerName=BioImage Suite Web <%= version%>
AppPublisher=Yale BioImage Suite Project
AppPublisherURL=http://www.bisweb.yale.edu
AppSupportURL=http://bisweb.yale.edu
AppUpdatesURL=http://bisweb.yale.edu
OutputDir=<%= outputdir%>
DefaultDirName="C:/Program Files/BioImageSuiteWeb"
AppName=BioImageSuiteWeb
DefaultGroupName=BioImageSuiteWeb
LicenseFile=<%= licensefile%>
SetupIconFile=<%= iconfile%>
OutputBaseFilename=BioImageSuiteWebInstaller-<%= version%>-<%= date%>
AllowRootDirectory=no
AllowUNCPath=no
SetupLogging=yes
Compression=zip
SolidCompression=yes
RestartIfNeededByRun=no
ChangesAssociations=no
DirExistsWarning=no



[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "<%= indir%>\*"; DestDir: "{app}\"; Flags: ignoreversion recursesubdirs createallsubdirs;Permissions: everyone-readexec

[Icons]
Name: "{group}\BioImageWeb Menu"; Filename: "{app}\BioImageSuiteWeb.exe"
<%=tools%>
Name: "{group}\Uninstall\{cm:UninstallProgram,BioImageSuiteWeb}"; Filename: "{uninstallexe}" 

