import type { Action } from 'svelte/action';

export interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

export interface PanZoomController {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  fitToScreen: () => void;
}

export interface PanZoomOptions {
  minScale?: number;
  maxScale?: number;
  onRegister?: (controller: PanZoomController) => void;
  onChange?: (state: PanZoomState) => void;
}

export const usePanZoom: Action<HTMLElement, PanZoomOptions | undefined> = (node, initialOptions) => {
  let options = initialOptions || {};
  const minScale = options.minScale ?? 0.1;
  const maxScale = options.maxScale ?? 5;

  let x = 0;
  let y = 0;
  let scale = 1;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function getTarget(): HTMLElement | null {
    return (node.firstElementChild as HTMLElement) || null;
  }

  function applyTransform() {
    const target = getTarget();
    if (target) {
      target.style.transformOrigin = 'center center';
      target.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      target.style.transition = isDragging ? 'none' : 'transform 0.1s ease-out';
    }
    options.onChange?.({ x, y, scale });
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = node.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = node.clientWidth / 2;
    const centerY = node.clientHeight / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

    // Zoom toward mouse pointer relative to center
    x = dx - (dx - x) * (newScale / scale);
    y = dy - (dy - y) * (newScale / scale);
    scale = newScale;

    applyTransform();
  }

  function handleMouseDown(e: MouseEvent) {
    // Only left click
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;
    node.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    x = e.clientX - startX;
    y = e.clientY - startY;
    applyTransform();
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      node.style.cursor = 'grab';
    }
  }

  const controller: PanZoomController = {
    zoomIn() {
      const newScale = Math.min(scale * 1.25, maxScale);
      x = x * (newScale / scale);
      y = y * (newScale / scale);
      scale = newScale;
      applyTransform();
    },
    zoomOut() {
      const newScale = Math.max(scale * 0.8, minScale);
      x = x * (newScale / scale);
      y = y * (newScale / scale);
      scale = newScale;
      applyTransform();
    },
    reset() {
      x = 0;
      y = 0;
      scale = 1;
      applyTransform();
    },
    fitToScreen() {
      const target = getTarget();
      if (!target) return;
      const containerWidth = node.clientWidth;
      const containerHeight = node.clientHeight;
      if (containerWidth === 0 || containerHeight === 0) return;

      const targetRect = target.getBoundingClientRect();
      const unscaledWidth = targetRect.width / scale || target.offsetWidth || 600;
      const unscaledHeight = targetRect.height / scale || target.offsetHeight || 400;

      const scaleX = (containerWidth * 0.85) / unscaledWidth;
      const scaleY = (containerHeight * 0.85) / unscaledHeight;
      scale = Math.min(Math.max(Math.min(scaleX, scaleY), minScale), 1.5);

      // Dead center
      x = 0;
      y = 0;
      applyTransform();
    },
  };

  options.onRegister?.(controller);

  node.style.cursor = 'grab';
  node.style.userSelect = 'none';
  node.style.overflow = 'hidden';

  node.addEventListener('wheel', handleWheel, { passive: false });
  node.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return {
    update(newOptions) {
      options = newOptions || {};
    },
    destroy() {
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    },
  };
};
