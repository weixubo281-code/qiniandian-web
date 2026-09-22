$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'))) {
    $npmCli = Join-Path (Split-Path -Parent $nodePath) 'node_modules\npm\bin\npm-cli.js'
    & $nodePath $npmCli ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败。' }
}
Write-Host '祈年殿本地预览：http://127.0.0.1:4173/ 。按 Ctrl+C 停止。'
& $nodePath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js') --host 127.0.0.1 --port 4173 --strictPort
