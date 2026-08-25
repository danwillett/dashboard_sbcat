import shpWriteScriptUrl from "shp-write/shpwrite.js?url";

export interface ShpWriteOutput {
  shp: DataView;
  shx: DataView;
  dbf: DataView;
}

export interface ShpWriteBrowserApi {
  write: (
    properties: Record<string, unknown>[],
    geometryType: string,
    geometries: unknown,
    callback: (err: Error | null, files?: ShpWriteOutput) => void
  ) => void;
}

let shpWritePromise: Promise<ShpWriteBrowserApi> | null = null;

function scriptAlreadyLoaded(): ShpWriteBrowserApi | null {
  const api = (window as unknown as { shpwrite?: ShpWriteBrowserApi }).shpwrite;
  return api?.write ? api : null;
}

/**
 * Load the browserified shp-write bundle (UMD). Avoids Vite CJS interop issues
 * with the package's Node `index.js` entry.
 */
export function loadShpWriteBrowser(): Promise<ShpWriteBrowserApi> {
  const existing = scriptAlreadyLoaded();
  if (existing) return Promise.resolve(existing);

  if (shpWritePromise) return shpWritePromise;

  shpWritePromise = new Promise((resolve, reject) => {
    const ready = scriptAlreadyLoaded();
    if (ready) {
      resolve(ready);
      return;
    }

    const script = document.createElement("script");
    script.src = shpWriteScriptUrl;
    script.async = true;
    script.onload = () => {
      const api = scriptAlreadyLoaded();
      if (api) {
        resolve(api);
        return;
      }
      reject(new Error("shp-write loaded but did not register on window."));
    };
    script.onerror = () => {
      shpWritePromise = null;
      reject(new Error("Could not load the shapefile writer."));
    };
    document.head.appendChild(script);
  });

  return shpWritePromise;
}
