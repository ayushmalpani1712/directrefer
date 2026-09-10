#!/usr/bin/env bash
set -euo pipefail

echo "=== Dependency Vulnerability Scan ==="
echo "Running npm audit..."
echo ""

AUDIT_JSON=$(npm audit --json 2>/dev/null || true)

if [ -z "$AUDIT_JSON" ]; then
  echo "ERROR: Failed to run npm audit"
  exit 1
fi

CRITICAL_COUNT=$(echo "$AUDIT_JSON" | grep -o '"critical":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
HIGH_COUNT=$(echo "$AUDIT_JSON" | grep -o '"high":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
MODERATE_COUNT=$(echo "$AUDIT_JSON" | grep -o '"moderate":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
LOW_COUNT=$(echo "$AUDIT_JSON" | grep -o '"low":[0-9]*' | head -1 | cut -d: -f2 || echo "0")

CRITICAL_COUNT=${CRITICAL_COUNT:-0}
HIGH_COUNT=${HIGH_COUNT:-0}
MODERATE_COUNT=${MODERATE_COUNT:-0}
LOW_COUNT=${LOW_COUNT:-0}

TOTAL=$((CRITICAL_COUNT + HIGH_COUNT + MODERATE_COUNT + LOW_COUNT))

echo "Vulnerability Summary:"
echo "  Critical: $CRITICAL_COUNT"
echo "  High:     $HIGH_COUNT"
echo "  Moderate: $MODERATE_COUNT"
echo "  Low:      $LOW_COUNT"
echo "  Total:    $TOTAL"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "No vulnerabilities found."
  exit 0
fi

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "CRITICAL vulnerabilities detected. Listing affected packages:"
  echo ""
  echo "$AUDIT_JSON" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    vulns = data.get('vulnerabilities', {})
    for name, info in vulns.items():
        if info.get('severity') == 'critical':
            via = info.get('via', [])
            fix = info.get('fixAvailable', False)
            print(f'  - {name} (severity: critical, fix available: {fix})')
except Exception as e:
    print(f'  Error parsing audit data: {e}')
" 2>/dev/null || echo "  (Install python3 to see detailed breakdown)"
  echo ""
  echo "Run 'npm audit fix' or 'npm audit fix --force' to resolve."
  exit 1
fi

if [ "$HIGH_COUNT" -gt 0 ]; then
  echo "High severity vulnerabilities found. Listing affected packages:"
  echo ""
  echo "$AUDIT_JSON" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    vulns = data.get('vulnerabilities', {})
    for name, info in vulns.items():
        if info.get('severity') == 'high':
            fix = info.get('fixAvailable', False)
            print(f'  - {name} (severity: high, fix available: {fix})')
except Exception as e:
    print(f'  Error parsing audit data: {e}')
" 2>/dev/null || echo "  (Install python3 to see detailed breakdown)"
  echo ""
  echo "Run 'npm audit fix' to resolve."
fi

echo ""
echo "Scan complete."
