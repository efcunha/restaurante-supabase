$ErrorActionPreference = 'Stop'

$port = 8081
Write-Host "[start-web-8081] Ensuring port $port is free..."

$pids = @()

try {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  }
} catch {
  $pids = @()
}

if (-not $pids -or $pids.Count -eq 0) {
  try {
    $netstatLines = netstat -ano | Select-String ":$port"
    foreach ($line in $netstatLines) {
      $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
      if ($parts.Length -ge 5) {
        $pid = $parts[$parts.Length - 1]
        if ($pid -match '^[0-9]+$') {
          $pids += [int]$pid
        }
      }
    }
    $pids = $pids | Select-Object -Unique
  } catch {
    $pids = @()
  }
}

foreach ($pid in $pids) {
  if ($pid -and $pid -ne $PID) {
    try {
      Write-Host "[start-web-8081] Stopping process on port $port (PID: $pid)..."
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Host "[start-web-8081] Could not stop PID $pid automatically."
    }
  }
}

Start-Sleep -Milliseconds 500
Write-Host "[start-web-8081] Starting Expo Web on port $port..."

npx expo start --web --port $port
