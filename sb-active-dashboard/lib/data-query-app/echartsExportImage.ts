type EchartsExportInstance = {
  getDataURL: (opts: {
    type?: string;
    pixelRatio?: number;
    backgroundColor?: string;
  }) => string;
  getWidth: () => number;
  getHeight: () => number;
};

function rasterizeSvgDataUrl(
  svgDataUrl: string,
  opts: {
    width: number;
    height: number;
    pixelRatio: number;
    backgroundColor: string;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = Math.max(1, Math.round(opts.width * opts.pixelRatio));
      const height = Math.max(1, Math.round(opts.height * opts.pixelRatio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to rasterize chart SVG"));
    img.src = svgDataUrl;
  });
}

/** PNG data URL suitable for jsPDF, including when ECharts uses the SVG renderer. */
export async function getEchartsPngDataUrl(
  instance: EchartsExportInstance,
  options?: { pixelRatio?: number; backgroundColor?: string }
): Promise<string> {
  const pixelRatio = options?.pixelRatio ?? 2;
  const backgroundColor = options?.backgroundColor ?? "#ffffff";

  const pngAttempt = instance.getDataURL({
    type: "png",
    pixelRatio,
    backgroundColor,
  });
  if (pngAttempt.startsWith("data:image/png")) {
    return pngAttempt;
  }

  const svgDataUrl = pngAttempt.startsWith("data:image/svg")
    ? pngAttempt
    : instance.getDataURL({
        type: "svg",
        backgroundColor,
      });

  if (!svgDataUrl.startsWith("data:image/svg")) {
    throw new Error("Chart export returned an unsupported image format");
  }

  return rasterizeSvgDataUrl(svgDataUrl, {
    width: instance.getWidth(),
    height: instance.getHeight(),
    pixelRatio,
    backgroundColor,
  });
}
