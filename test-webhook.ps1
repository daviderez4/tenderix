$body = @{
    tender_id = "e1e1e1e1-0000-0000-0000-000000000001"
    org_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://daviderez.app.n8n.cloud/webhook/gate-matching" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    Write-Host "SUCCESS!" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host $reader.ReadToEnd()
    }
}
