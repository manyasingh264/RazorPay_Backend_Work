# ReimburseApp — Frontend Development Server
#
# Usage:
#   cd to the RP_Assignment folder, then run:
#   npx serve frontend --cors
#
# Or to serve the entire project from the repo root:
#   npx serve . --cors

Write-Host "Starting ReimburseApp frontend server..." -ForegroundColor Cyan
Write-Host "Opening at http://localhost:3000" -ForegroundColor Green
npx serve ./frontend --cors --listen 3000
