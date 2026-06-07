export function applyIACompatibility(elem) {
  if (!elem || typeof elem !== 'object') return;

  // Compat IA: { color } -> fillColor/strokeColor
  if (typeof elem.color === 'string') {
    if (
      typeof elem.fillColor !== 'string' &&
      (elem.type === 'rectangle' || elem.type === 'circle' || elem.type === 'polygon')
    ) {
      elem.fillColor = elem.color;
    }
    if (typeof elem.strokeColor !== 'string') {
      elem.strokeColor = elem.color;
    }
  }

  // Compat IA: { isAnim } -> { active }
  if (typeof elem.isAnim === 'boolean' && typeof elem.active !== 'boolean') {
    elem.active = elem.isAnim;
  }

  // Compat IA: circle con radius y (x,y) como centro.
  if (
    elem.type === 'circle' &&
    typeof elem.radius === 'number' &&
    (!Number.isFinite(elem.width) || !Number.isFinite(elem.height))
  ) {
    const r = elem.radius;
    const cx = Number.isFinite(elem.x) ? elem.x : 0;
    const cy = Number.isFinite(elem.y) ? elem.y : 0;
    elem.x = cx - r;
    elem.y = cy - r;
    elem.width = r * 2;
    elem.height = r * 2;
    delete elem.radius;
  }

  // Compat IA: line con x1/y1/x2/y2.
  if (
    elem.type === 'line' &&
    Number.isFinite(elem.x1) &&
    Number.isFinite(elem.y1) &&
    Number.isFinite(elem.x2) &&
    Number.isFinite(elem.y2) &&
    (!Number.isFinite(elem.x) ||
      !Number.isFinite(elem.y) ||
      !Number.isFinite(elem.endX) ||
      !Number.isFinite(elem.endY))
  ) {
    elem.x = elem.x1;
    elem.y = elem.y1;
    elem.endX = elem.x2;
    elem.endY = elem.y2;
    delete elem.x1;
    delete elem.y1;
    delete elem.x2;
    delete elem.y2;
  }
}
