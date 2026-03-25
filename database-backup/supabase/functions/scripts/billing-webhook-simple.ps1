Write-Host "Test 1: Webhook SEM assinatura (deve retornar 401)..."
$response = Invoke-WebRequest -Uri 'https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook' `
  -Method POST `
  -Headers @{'Content-Type' = 'application/json'} `
  -Body '{"action":"payment.updated","data":{"id":"test-123"}}' `
  -SkipHttpErrorCheck

Write-Host "HTTP Status: $($response.StatusCode)"
Write-Host "Response: $($response.Content)"
Write-Host ""

if ($response.StatusCode -eq 401) {
  Write-Host "[PASS] Unsigned request corretamente rejeitado com 401"
} else {
  Write-Host "[INFO] Request retornou: $($response.StatusCode)"
}
