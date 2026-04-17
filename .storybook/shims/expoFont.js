const loadedFonts = new Set();

async function loadAsync(fontFamilyOrMap) {
  if (!fontFamilyOrMap) {
    return;
  }

  if (typeof fontFamilyOrMap === 'string') {
    loadedFonts.add(fontFamilyOrMap);
    return;
  }

  if (typeof fontFamilyOrMap === 'object') {
    Object.keys(fontFamilyOrMap).forEach((key) => loadedFonts.add(key));
  }
}

async function unloadAsync(fontFamily) {
  if (fontFamily) {
    loadedFonts.delete(fontFamily);
  }
}

function isLoaded(fontFamily) {
  if (!fontFamily) {
    return true;
  }
  return loadedFonts.has(fontFamily);
}

function isLoading() {
  return false;
}

function getLoadedFonts() {
  return Array.from(loadedFonts);
}

function processFontFamily(fontFamily) {
  return fontFamily;
}

function useFonts(fontMap) {
  if (fontMap && typeof fontMap === 'object') {
    Object.keys(fontMap).forEach((key) => loadedFonts.add(key));
  }
  return [true, null];
}

const Font = {
  loadAsync,
  unloadAsync,
  isLoaded,
  isLoading,
  getLoadedFonts,
  processFontFamily,
};

export {
  Font,
  getLoadedFonts,
  isLoaded,
  isLoading,
  loadAsync,
  processFontFamily,
  unloadAsync,
  useFonts,
};

export default Font;
