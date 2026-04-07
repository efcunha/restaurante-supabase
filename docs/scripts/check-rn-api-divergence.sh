#!/bin/bash
# check-rn-api-divergence.sh
# Detects usage of React Native 0.82+ APIs in restaurante-web that may not exist in restaurante-app (0.81.5)
# Run in CI or pre-commit to warn about divergence

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESTAURANTE_WEB="${PROJECT_ROOT}/restaurante-web"
RESTAURANTE_APP="${PROJECT_ROOT}/restaurante-app"

# RN 0.82+ APIs that should be verified against restaurante-app (0.81.5)
# Based on RN changelog and testing
APIS_0_82_PLUS=(
  "useWindowDimensions"           # improved in 0.82
  "BackHandler\.exitApp"          # may have changed
  "AppState\.currentState"        # deprecated in favor of AppState.addListener
  "InteractionManager\.clearInteractionHandle"  # removed in 0.82
  "Appearance\.setColorScheme"    # changed API
  "ViewPropTypes"                 # deprecated in 0.82
  "ImageBackground"              # behavior changed
  "VirtualizedList\.getItemLayout" # precision improved
)

# APIs that diverge significantly
CRITICAL_APIS=(
  "useWindowDimensions"
  "InteractionManager\.clearInteractionHandle"
  "Appearance\.setColorScheme"
  "NativeModules\.getViewManagerConfig"
)

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=========================================="
echo "React Native API Divergence Check"
echo "Checking: restaurante-web (RN 0.84.0)"
echo "Against: restaurante-app (RN 0.84.0)"
echo "=========================================="

ISSUES_FOUND=0
CRITICAL_ISSUES=0

for API in "${APIS_0_82_PLUS[@]}"; do
  # Search in restaurante-web source files
  if grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$API" \
    "${RESTAURANTE_WEB}/src" 2>/dev/null | grep -v "node_modules" >/dev/null 2>&1; then
    
    COUNT=$(grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$API" \
      "${RESTAURANTE_WEB}/src" 2>/dev/null | grep -v "node_modules" | wc -l)
    
    # Check if it exists in restaurante-app
    if ! grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$API" \
      "${RESTAURANTE_APP}/src" 2>/dev/null | grep -v "node_modules" >/dev/null 2>&1; then
      
      # Check if it's a critical API
      if [[ " ${CRITICAL_APIS[@]} " =~ " ${API} " ]]; then
        echo -e "${RED}✗ CRITICAL${NC}: '$API' found ${COUNT} times in web but NOT in app"
        echo "  → This API may not exist in RN 0.81.5"
        grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$API" \
          "${RESTAURANTE_WEB}/src" 2>/dev/null | head -3 | sed 's/^/    /'
        ((CRITICAL_ISSUES++))
      else
        echo -e "${YELLOW}⚠${NC}: '$API' found ${COUNT} times in web but NOT in app"
        echo "  → Warning: possible divergence (may be false positive)"
        grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$API" \
          "${RESTAURANTE_WEB}/src" 2>/dev/null | head -2 | sed 's/^/    /'
        ((ISSUES_FOUND++))
      fi
    else
      echo -e "${GREEN}✓${NC}: '$API' found in both (compatible)"
    fi
  fi
done

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "Critical Issues: ${RED}${CRITICAL_ISSUES}${NC}"
echo -e "Warnings: ${YELLOW}${ISSUES_FOUND}${NC}"

if [ $CRITICAL_ISSUES -gt 0 ]; then
  echo ""
  echo -e "${RED}FAILED${NC}: Critical API divergence detected."
  echo "Action: Review the APIs above and either:"
  echo "  1. Update restaurante-app to RN 0.84.0+ (recommended)"
  echo "  2. Refactor restaurante-web to use RN 0.81.5-compatible APIs"
  echo "  3. Add conditional logic with version checks"
  exit 1
elif [ $ISSUES_FOUND -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}WARNING${NC}: Potential API divergence detected."
  echo "Action: Manually review the warnings above."
  exit 0
else
  echo ""
  echo -e "${GREEN}PASSED${NC}: No critical API divergence detected."
  exit 0
fi
