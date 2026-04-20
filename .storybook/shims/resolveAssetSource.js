const transparentPixelDataUri = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

export default function resolveAssetSource(source) {
  if (source == null) {
    return null;
  }

  if (Array.isArray(source)) {
    return resolveAssetSource(source[0]);
  }

  if (typeof source === 'number') {
    return {
      uri: transparentPixelDataUri,
      width: 1,
      height: 1,
      scale: 1,
    };
  }

  if (typeof source === 'string') {
    return {
      uri: source,
    };
  }

  if (typeof source === 'object' && source.uri) {
    return source;
  }

  return source;
}
