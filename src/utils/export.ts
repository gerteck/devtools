/**
 * Utility functions for exporting SVG diagrams as vector SVG or high-res PNG.
 */

export function downloadSvg(svgElement: SVGSVGElement, filename = 'diagram.svg') {
  try {
    if (!svgElement) return;
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style');

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);

    // Add namespaces if missing
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Prepend XML declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), filename);
  } catch (err) {
    console.error('Failed to export SVG:', err);
  }
}

export function downloadPng(
  svgElement: SVGSVGElement,
  filename = 'diagram.png',
  scale = 2,
  backgroundColor = '#121215'
) {
  try {
    if (!svgElement) return;

    // 1. Clone the SVG so we don't mutate the live DOM element
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style');

    // 2. Determine intrinsic vector dimensions from viewBox or getBBox
    let intrinsicWidth = 0;
    let intrinsicHeight = 0;

    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(parseFloat);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        intrinsicWidth = parts[2];
        intrinsicHeight = parts[3];
        clone.setAttribute('viewBox', `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`);
      }
    }

    if (!intrinsicWidth || !intrinsicHeight) {
      try {
        const bbox = svgElement.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          intrinsicWidth = bbox.width;
          intrinsicHeight = bbox.height;
          clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        }
      } catch {
        // getBBox might fail if offscreen or detached
      }
    }

    if (!intrinsicWidth || !intrinsicHeight) {
      intrinsicWidth = svgElement.clientWidth || 800;
      intrinsicHeight = svgElement.clientHeight || 600;
    }

    // Set explicit pixel dimensions on the clone matching its natural aspect ratio
    clone.setAttribute('width', `${intrinsicWidth}`);
    clone.setAttribute('height', `${intrinsicHeight}`);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const canvasWidth = Math.round(intrinsicWidth * scale);
    const canvasHeight = Math.round(intrinsicHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        // Fill background color
        if (backgroundColor && backgroundColor !== 'transparent') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Draw SVG onto canvas scaled up cleanly
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            triggerDownload(URL.createObjectURL(blob), filename);
          }
        }, 'image/png');
      } catch (err) {
        console.error('Failed to draw canvas for PNG export:', err);
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = (err) => {
      console.error('Failed to render SVG image on canvas for PNG export:', err);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
