export function walkElements(elements, visitor) {
  const stack = Array.isArray(elements) ? elements.slice() : [];
  while (stack.length) {
    const elem = stack.pop();
    if (!elem || typeof elem !== 'object') continue;

    if (visitor(elem) === false) return;

    if (elem.type === 'group' && Array.isArray(elem.elements)) {
      for (let i = elem.elements.length - 1; i >= 0; i--) stack.push(elem.elements[i]);
    }
  }
}

export function normalizeElementInPlace(elem) {
  if (!elem || typeof elem !== 'object') return;

  // No persistimos referencias a imagen en memoria.
  if (elem.imageData != null) delete elem.imageData;

  // Compat IA: { color } -> fillColor/strokeColor
  if (typeof elem.color === 'string') {
    if (
      typeof elem.fillColor !== 'string' &&
      (elem.type === 'rectangle' || elem.type === 'circle' || elem.type === 'polygon')
    ) {
      elem.fillColor = elem.color;
    }
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = elem.color;
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

  // Defaults minimos para que el engine no truene.
  if (elem.type === 'line') {
    if (!Number.isFinite(elem.x)) elem.x = 0;
    if (!Number.isFinite(elem.y)) elem.y = 0;
    if (!Number.isFinite(elem.endX)) elem.endX = elem.x;
    if (!Number.isFinite(elem.endY)) elem.endY = elem.y;
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
    if (typeof elem.animColor !== 'string') elem.animColor = '#4caf50';
    if (typeof elem.flowDirection !== 'string') elem.flowDirection = 'right';
    if (!Number.isFinite(elem.animOffset)) elem.animOffset = 0;
    if (!Array.isArray(elem.controlPoints)) elem.controlPoints = [];
  } else if (elem.type === 'rectangle' || elem.type === 'circle' || elem.type === 'image') {
    if (!Number.isFinite(elem.x)) elem.x = 0;
    if (!Number.isFinite(elem.y)) elem.y = 0;
    if (!Number.isFinite(elem.width)) elem.width = 0;
    if (!Number.isFinite(elem.height)) elem.height = 0;

    if (elem.type !== 'image') {
      if (typeof elem.fillColor !== 'string') elem.fillColor = '#0f3460';
      if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
    }
  } else if (elem.type === 'polygon' || elem.type === 'path') {
    if (typeof elem.strokeColor !== 'string') elem.strokeColor = '#e94560';
    if (typeof elem.fillColor !== 'string') elem.fillColor = '#0f3460';
    if (!Number.isFinite(elem.lineWidth)) elem.lineWidth = 3;
  }

  if (typeof elem.name !== 'string') elem.name = '';
  if (typeof elem.locked !== 'boolean') elem.locked = false;
  if (typeof elem.active !== 'boolean') elem.active = true;
  if (typeof elem.connectionStatus !== 'string') elem.connectionStatus = 'none';
}

export function normalizeProjectInPlace(project) {
  if (!project || typeof project !== 'object') return;
  if (!Array.isArray(project.elements)) project.elements = [];

  walkElements(project.elements, (elem) => {
    normalizeElementInPlace(elem);
    return true;
  });

  if (!project.camera || typeof project.camera !== 'object') {
    project.camera = { x: 0, y: 0, zoom: 1 };
  } else {
    const cam = project.camera;
    if (!Number.isFinite(cam.x)) cam.x = 0;
    if (!Number.isFinite(cam.y)) cam.y = 0;
    if (!Number.isFinite(cam.zoom)) cam.zoom = 1;
  }

  if (typeof project.name !== 'string') project.name = '';
  if (typeof project.date !== 'string') project.date = new Date().toISOString();
}
