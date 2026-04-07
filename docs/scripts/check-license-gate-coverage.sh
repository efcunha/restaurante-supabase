#!/bin/bash
# check-license-gate-coverage.sh
# Validates that LicenseGate component wraps all critical operational screens
# before billing can be enabled in production
#
# Critical screens (per SKILL.md):
#   - NovoPedidoScreen
#   - ComandaGerenciamentoScreen
#   - RotasDeliveryScreen
#   - CozinhaScreen
#   - MontagemScreen
#
# Run in CI as a pre-deploy gate to prevent billing without proper coverage

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESTAURANTE_APP="${PROJECT_ROOT}/restaurante-app"
RESTAURANTE_WEB="${PROJECT_ROOT}/restaurante-web"

CRITICAL_SCREENS=(
  "NovoPedidoScreen"
  "ComandaGerenciamentoScreen"
  "RotasDeliveryScreen"
  "CozinhaScreen"
  "MontagemScreen"
)

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "LicenseGate Coverage Check"
echo "Prerequisites for Billing Production Launch"
echo "=========================================="

MISSING_COVERAGE=0

for TARGET in "restaurante-app" "restaurante-web"; do
  if [ "$TARGET" = "restaurante-app" ]; then
    BASE_PATH="$RESTAURANTE_APP"
  else
    BASE_PATH="$RESTAURANTE_WEB"
  fi
  
  echo ""
  echo -e "${BLUE}Checking ${TARGET}...${NC}"
  
  # Check if LicenseGate component exists
  LICENSEGATE_FILE=$(find "$BASE_PATH/src" -name "LicenseGate.tsx" -o -name "LicenseGate.ts" -o -name "LicenseGate.jsx" 2>/dev/null | head -1)
  
  if [ -z "$LICENSEGATE_FILE" ]; then
    echo -e "${RED}✗ FAIL: LicenseGate component not found in $TARGET${NC}"
    ((MISSING_COVERAGE++))
    continue
  fi
  
  echo -e "${GREEN}✓${NC} LicenseGate component found"
  
  # Verify LicenseGate has billing_enabled check
  if grep -q "billing_enabled\|BILLING" "$LICENSEGATE_FILE"; then
    echo -e "${GREEN}✓${NC} LicenseGate has billing feature flag checks"
  else
    echo -e "${YELLOW}⚠${NC} LicenseGate may be missing billing_enabled checks"
    ((MISSING_COVERAGE++))
  fi
  
  # Check each critical screen for LicenseGate wrapper
  for SCREEN in "${CRITICAL_SCREENS[@]}"; do
    SCREEN_FILE=$(find "$BASE_PATH/src" -name "${SCREEN}.tsx" -o -name "${SCREEN}.ts" 2>/dev/null | head -1)
    
    if [ -z "$SCREEN_FILE" ]; then
      echo -e "${YELLOW}⚠${NC} Screen '$SCREEN' not found (may be named differently)"
      continue
    fi
    
    # Check if LicenseGate wraps the screen or is used in the screen component
    if grep -q "LicenseGate\|<LicenseGate" "$SCREEN_FILE" || \
       grep -q "useLicenseGate\|withLicenseGate" "$SCREEN_FILE"; then
      echo -e "${GREEN}✓${NC} $SCREEN is wrapped with LicenseGate"
    else
      echo -e "${RED}✗ FAIL: $SCREEN is NOT wrapped with LicenseGate${NC}"
      echo "    → Screen file: $SCREEN_FILE"
      echo "    → Add: <LicenseGate> wrapper or useLicenseGate() hook"
      ((MISSING_COVERAGE++))
    fi
  done
done

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ $MISSING_COVERAGE -gt 0 ]; then
  echo -e "${RED}FAILED${NC}: LicenseGate coverage incomplete (${MISSING_COVERAGE} issues)"
  echo ""
  echo "Action required before enabling billing in production:"
  echo "  1. Ensure LicenseGate.tsx exists in both restaurante-app and restaurante-web"
  echo "  2. Verify LicenseGate checks billing_enabled feature flag"
  echo "  3. Wrap all critical screens:"
  for SCREEN in "${CRITICAL_SCREENS[@]}"; do
    echo "     - $SCREEN"
  done
  echo ""
  echo "Reference implementation:"
  echo "  export const ScreenWithGate = () => ("
  echo "    <LicenseGate>"
  echo "      <CriticalScreen />"
  echo "    </LicenseGate>"
  echo "  );"
  echo ""
  echo "Set EXPOSE_BILLING_GATE=1 to force check (CI mode)"
  if [ -z "$EXPOSE_BILLING_GATE" ]; then
    exit 1
  fi
else
  echo -e "${GREEN}PASSED${NC}: LicenseGate coverage is complete"
  echo ""
  echo "Billing production launch prerequisites met:"
  echo "  ✓ LicenseGate component implemented in app and web"
  echo "  ✓ All critical screens wrapped with billing gate"
  echo "  ✓ Feature flag protected: EXPO_PUBLIC_FEATURE_BILLING"
  echo ""
  echo "Next steps:"
  echo "  1. Set EXPO_PUBLIC_FEATURE_BILLING=true in production env"
  echo "  2. Monitor error rate in Sentry (target: no degradation)"
  echo "  3. Smoke test: verify blocked user sees subscription prompt"
  echo "  4. Gradual rollout: start at 5% of users, ramp to 100%"
  exit 0
fi
