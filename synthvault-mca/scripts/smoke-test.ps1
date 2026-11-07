# =====================================================================
#  SynthVault MCA - End-to-End Smoke Test  (24 checks)
#  Covers every REST endpoint + all security negative cases.
#
#  PREREQUISITES
#    1) MySQL running on port 3306
#    2) App running on port 8080 (mvn spring-boot:run)
#
#  RUN
#    pwsh -File scripts\smoke-test.ps1
# =====================================================================

$api  = 'http://localhost:8080'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$csv  = Join-Path $root 'sample-data\customers.csv'
$work = Join-Path $env:TEMP 'svtest'
New-Item -ItemType Directory -Force -Path $work | Out-Null
Set-Location $work

$script:pass = 0
$script:fail = 0

function Check([string]$name, [bool]$ok, [string]$info) {
    if ($ok) { $script:pass++; Write-Host ("  [PASS] {0,-44} {1}" -f $name, $info) -ForegroundColor Green }
    else     { $script:fail++; Write-Host ("  [FAIL] {0,-44} {1}" -f $name, $info) -ForegroundColor Red }
}

function Hdr([string]$t) { Write-Host "`n$t" -ForegroundColor Cyan }

# ---- helper: request that never throws; returns @{status=; data=; raw=} ----
function Call {
    param([string]$Method, [string]$Path, [hashtable]$Headers, $Body, $Form)
    $p = @{ Uri = "$api$Path"; Method = $Method; SkipHttpErrorCheck = $true; ErrorAction = 'Stop' }
    if ($Headers) { $p.Headers = $Headers }
    if ($Body)    { $p.ContentType = 'application/json'; $p.Body = ($Body | ConvertTo-Json) }
    if ($Form)    { $p.Form = $Form }
    try { $r = Invoke-WebRequest @p }
    catch { return @{ status = 0; data = $null; raw = $_.Exception.Message } }
    $data = $null
    if ($r.Content) { try { $data = $r.Content | ConvertFrom-Json } catch { } }
    @{ status = [int]$r.StatusCode; data = $data; raw = $r.Content }
}

Write-Host "`n=========== SynthVault MCA : END-TO-END SMOKE TEST ===========" -ForegroundColor Yellow

# ---------------------------------------------------------------- AUTH
Hdr 'AUTH  (/api/auth)'
$stamp = [int](Get-Date -UFormat %s)
$email = "mca$stamp@sv.test"
$pwd   = 'Passw0rd123'

# 1  register -> 201 UserResponse (no token here, that is by design)
$r = Call 'Post' '/api/auth/register' $null @{ fullName = 'MCA Student'; email = $email; password = $pwd }
Check '1.  POST   /api/auth/register' ($r.status -eq 201 -and $r.data.email -eq $email) "HTTP $($r.status) id=$($r.data.id) role=$($r.data.role)"

# 2  duplicate email -> 400
$r = Call 'Post' '/api/auth/register' $null @{ fullName = 'Duplicate'; email = $email; password = $pwd }
Check '2.  POST   register duplicate -> 400' ($r.status -eq 400) "HTTP $($r.status) -> $($r.data.message)"

# 3  login -> 200 AuthResponse with UUID token
$r = Call 'Post' '/api/auth/login' $null @{ email = $email; password = $pwd }
$tok = $r.data.token
Check '3.  POST   /api/auth/login' ($r.status -eq 200 -and "$tok".Length -eq 36) "HTTP $($r.status) tokenLen=$("$tok".Length) type=$($r.data.tokenType)"
$H = @{ 'X-Auth-Token' = "$tok" }

# 4  wrong password -> 401
$r = Call 'Post' '/api/auth/login' $null @{ email = $email; password = 'wrongpass' }
Check '4.  POST   login bad password -> 401' ($r.status -eq 401) "HTTP $($r.status) -> $($r.data.message)"

# 5  me
$r = Call 'Get' '/api/auth/me' $H
Check '5.  GET    /api/auth/me' ($r.status -eq 200 -and $r.data.email -eq $email) "HTTP $($r.status) $($r.data.fullName) / $($r.data.role)"

# ---------------------------------------------------------------- PROJECTS
Hdr 'PROJECTS  (/api/projects)'

# 6  no token -> 401
$r = Call 'Get' '/api/projects' $null
Check '6.  GET    projects without token -> 401' ($r.status -eq 401) "HTTP $($r.status) -> $($r.data.message)"

# 7  create -> 201
$r = Call 'Post' '/api/projects' $H @{ name = 'MCA Demo Project'; description = 'Final year demo' }
$projId = $r.data.id
Check '7.  POST   /api/projects' ($r.status -eq 201) "HTTP $($r.status) projectId=$projId"

# 8  list
$r = Call 'Get' '/api/projects' $H
Check '8.  GET    /api/projects' ($r.status -eq 200 -and @($r.data).Count -ge 1) "HTTP $($r.status) count=$(@($r.data).Count)"

# 9  get one
$r = Call 'Get' "/api/projects/$projId" $H
Check '9.  GET    /api/projects/{id}' ($r.status -eq 200 -and $r.data.id -eq $projId) "HTTP $($r.status) name=$($r.data.name)"

# 10 update
$r = Call 'Put' "/api/projects/$projId" $H @{ name = 'MCA Demo Project Updated'; description = 'Edited by smoke test' }
Check '10. PUT    /api/projects/{id}' ($r.status -eq 200 -and $r.data.name -like '*Updated*') "HTTP $($r.status) name=$($r.data.name)"

# ---------------------------------------------------------------- DATASETS
Hdr 'DATASETS  (upload / analyze / list)'

# 11 non-csv file -> 400
'totally not a csv' | Set-Content bad.txt
$r = Call 'Post' "/api/projects/$projId/datasets" $H $null @{ file = Get-Item 'bad.txt' }
Check '11. POST   upload bad.txt -> 400' ($r.status -eq 400) "HTTP $($r.status) -> $($r.data.message)"

# 12 upload customers.csv -> 201  (validate+store+parse+types+PII+score+save)
$r = Call 'Post' "/api/projects/$projId/datasets" $H $null @{ file = Get-Item $csv }
$did = $r.data.id
Check '12. POST   upload customers.csv' ($r.status -eq 201 -and $r.data.rowCount -eq 10 -and $r.data.columnCount -eq 8) `
      "HTTP $($r.status) datasetId=$did rows=$($r.data.rowCount) cols=$($r.data.columnCount)"

# 13 privacy report returned by the upload call
$pr = $r.data.privacyReport
Check '13. Privacy report (score/level/PII)' ($pr.riskScore -gt 0 -and $pr.piiColumnCount -ge 3) `
      "score=$($pr.riskScore) level=$($pr.riskLevel) piiColumns=$($pr.piiColumnCount)"

# 14 list datasets of project
$r = Call 'Get' "/api/projects/$projId/datasets" $H
Check '14. GET    /api/projects/{id}/datasets' ($r.status -eq 200 -and @($r.data).Count -eq 1) "HTTP $($r.status) count=$(@($r.data).Count)"

# 15 analysis endpoint (schema + PII + report + 5-row preview)
$r = Call 'Get' "/api/datasets/$did/analysis" $H
$pii = @($r.data.columns | Where-Object { $_.piiType -ne 'NONE' })
Check '15. GET    /api/datasets/{id}/analysis' ($r.status -eq 200 -and $r.data.columns.Count -eq 8 -and $pii.Count -ge 3) `
      "HTTP $($r.status) cols=$($r.data.columns.Count) piiCols=$($pii.Count) previewRows=$($r.data.preview.Count)"

# ---------------------------------------------------------------- GENERATE
Hdr 'GENERATION  (synthetic data + download)'

# 16 generate 100 synthetic rows -> 201
$r = Call 'Post' "/api/datasets/$did/generate" $H @{ rowCount = 100 }
Check '16. POST   /api/datasets/{id}/generate' ($r.status -eq 201 -and $r.data.rowCount -eq 100) `
      "HTTP $($r.status) rows=$($r.data.rowCount) url=$($r.data.downloadUrl)"

# 17 download the generated CSV
$dl = Invoke-WebRequest -Uri "$api/api/datasets/$did/synthetic/download" -Headers $H -OutFile 'synthetic.csv' -SkipHttpErrorCheck -PassThru
$lines = @(Get-Content 'synthetic.csv').Count
Check '17. GET    .../synthetic/download' ($dl.StatusCode -eq 200 -and $lines -eq 101) `
      "HTTP $($dl.StatusCode) lines=$lines (1 header + 100 rows)"

# ---------------------------------------------------------------- SECURITY
Hdr 'SECURITY  (roles + ownership + logout)'

# 18 ADMIN endpoint while logged in as USER -> 403
$r = Call 'Get' '/api/admin/users' $H
Check '18. GET    /api/admin/users (USER) -> 403' ($r.status -eq 403) "HTTP $($r.status) -> $($r.data.message)"

# 19 second user must NOT see the first user's dataset -> 404
$email2 = "other$stamp@sv.test"
$r  = Call 'Post' '/api/auth/register' $null @{ fullName = 'Other Student'; email = $email2; password = $pwd }
$r2 = Call 'Post' '/api/auth/login' $null @{ email = $email2; password = $pwd }
$H2 = @{ 'X-Auth-Token' = "$($r2.data.token)" }
$r  = Call 'Get' "/api/datasets/$did/analysis" $H2
Check '19. Ownership guard (other user) -> 404' ($r.status -eq 404) "HTTP $($r.status) -> $($r.data.message)"

# 20 logout
$r = Call 'Post' '/api/auth/logout' $H
Check '20. POST   /api/auth/logout' ($r.status -eq 200) "HTTP $($r.status) -> $($r.data.message)"

# 21 the logged-out token must stop working -> 401
$r = Call 'Get' '/api/auth/me' $H
Check '21. Logged-out token -> 401' ($r.status -eq 401) "HTTP $($r.status) -> $($r.data.message)"

# 22 log back in
$r = Call 'Post' '/api/auth/login' $null @{ email = $email; password = $pwd }
$tok2 = $r.data.token
$H3 = @{ 'X-Auth-Token' = "$tok2" }
Check '22. POST   login again (new token)' ($r.status -eq 200 -and "$tok2" -ne "$tok") "HTTP $($r.status) new token differs from old"

# 23 delete project -> 204
$r = Call 'Delete' "/api/projects/$projId" $H3
Check '23. DELETE /api/projects/{id}' ($r.status -eq 204) "HTTP $($r.status) (no body expected)"

# 24 list must now be empty
$r = Call 'Get' '/api/projects' $H3
Check '24. GET    /api/projects after delete' ($r.status -eq 200 -and @($r.data).Count -eq 0) "HTTP $($r.status) count=$(@($r.data).Count)"

# ---------------------------------------------------------------- EVIDENCE
Write-Host "`n----------------- EVIDENCE FOR VIVA ----------------" -ForegroundColor Yellow
Write-Host "Original header  : $((Get-Content $csv)[0])"
Write-Host "Original row 1   : $((Get-Content $csv)[1])"
Write-Host "Synthetic header : $((Get-Content 'synthetic.csv')[0])"
Write-Host "Synthetic row 1  : $((Get-Content 'synthetic.csv')[1])"
Write-Host "Synthetic row 2  : $((Get-Content 'synthetic.csv')[2])"
Write-Host "Privacy details  : $($pr.details)"

Write-Host ("`n========== RESULT: {0} PASSED, {1} FAILED ==========" -f $script:pass, $script:fail) `
    -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
exit $script:fail