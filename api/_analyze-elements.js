export function analyzeElements(elements, maxElements = 2000) {
  let count = 0;
  let hasImages = false;

  const stack = Array.isArray(elements) ? elements.slice() : [];
  while (stack.length) {
    const e = stack.pop();
    if (!e || typeof e !== 'object') continue;

    count++;

    // check if it's an image or video
    if (
      e.type === 'image' ||
      e.type === 'video' ||
      typeof e.imageSrc === 'string' ||
      e.imageData != null ||
      typeof e.videoSrc === 'string' ||
      e.videoData != null
    ) {
      hasImages = true;
    }

    if (e.type === 'group' && Array.isArray(e.elements)) {
      for (let i = e.elements.length - 1; i >= 0; i--) {
        stack.push(e.elements[i]);
      }
    }

    // Early exit para evitar recorridos gigantes.
    if (count > maxElements) break;
  }

  return { count, hasImages };
}
