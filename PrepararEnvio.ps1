# Script para preparar NexusApp para envío
# Este script crea un archivo .zip excluyendo node_modules y carpetas de sistema

$projectName = "NexusApp_Envio"
$zipFile = "$projectName.zip"

# Eliminar el zip anterior si existe
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

Write-Host "Comprimiendo proyecto NexusApp..." -ForegroundColor Cyan

# Comprimir excluyendo node_modules, .git y .next/dist si existen
Add-Type -AssemblyName System.IO.Compression.FileSystem
$excludeList = @("node_modules", ".git", "dist", ".next", "brain")

Get-ChildItem -Path . -Exclude $excludeList | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath $zipFile -Update
}

Write-Host "¡Listo! El archivo '$zipFile' ha sido creado y está listo para ser enviado." -ForegroundColor Green
Write-Host "Recuerda que no incluye node_modules, por lo que el destinatario deberá ejecutar 'npm install'." -ForegroundColor Yellow
