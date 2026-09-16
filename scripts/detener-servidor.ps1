$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $projectDir '.server-session.json'
if (-not (Test-Path -LiteralPath $stateFile)) {
    Write-Host 'No hay un servidor registrado en segundo plano. Si usaste INICIAR.cmd, pulsa Ctrl+C en su ventana.'
    exit 0
}
$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$serverProcess = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
if ($serverProcess -and $serverProcess.ProcessName -eq 'node' -and $serverProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $state.startedTicks) {
    Stop-Process -Id $serverProcess.Id
    Write-Host 'Servidor local detenido.'
} else {
    Write-Host 'El servidor registrado ya no esta activo.'
}
Remove-Item -LiteralPath $stateFile
