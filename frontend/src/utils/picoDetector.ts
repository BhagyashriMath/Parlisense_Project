/**
 * Pure TypeScript port of the Pico Face Detector (tehnokv/picojs).
 * Clean, zero external dependencies, 100% strict-mode compliant, fast (~2ms/frame).
 */

export interface PicoImage {
  pixels: Uint8Array;
  nrows: number;
  ncols: number;
  ldim: number;
}

export interface PicoParams {
  shiftfactor: number;
  minsize: number;
  maxsize: number;
  scalefactor: number;
}

export type ClassifyRegionFn = (
  r: number,
  c: number,
  s: number,
  pixels: Uint8Array,
  ldim: number
) => number;

export type Detection = [number, number, number, number]; // [row, col, size, score]

export function rgbaToGrayscale(
  rgba: Uint8ClampedArray | Uint8Array,
  nrows: number,
  ncols: number
): Uint8Array {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      const idx = (r * ncols + c) * 4;
      // Standard luminance formula
      gray[r * ncols + c] = (2 * rgba[idx] + 7 * rgba[idx + 1] + 1 * rgba[idx + 2]) / 10;
    }
  }
  return gray;
}

export function unpackCascade(bytes: Int8Array | Uint8Array): ClassifyRegionFn {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8; // skip 8-byte cascade header

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodesList: number[] = [];
  const tpredsList: number[] = [];
  const threshList: number[] = [];
  const pow2tdepth = 1 << tdepth;

  for (let t = 0; t < ntrees; ++t) {
    tcodesList.push(0, 0, 0, 0);
    for (let k = 0; k < 4 * pow2tdepth - 4; ++k) {
      tcodesList.push(bytes[p + k]);
    }
    p += 4 * pow2tdepth - 4;

    for (let i = 0; i < pow2tdepth; ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpredsList.push(dview.getFloat32(0, true));
      p += 4;
    }

    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    threshList.push(dview.getFloat32(0, true));
    p += 4;
  }

  const tcodes = new Int8Array(tcodesList);
  const tpreds = new Float32Array(tpredsList);
  const thresh = new Float32Array(threshList);

  return function classifyRegion(
    r: number,
    c: number,
    s: number,
    pixels: Uint8Array,
    ldim: number
  ): number {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        const r1 = (r + tcodes[root + 4 * idx + 0] * s) >> 8;
        const c1 = (c + tcodes[root + 4 * idx + 1] * s) >> 8;
        const r2 = (r + tcodes[root + 4 * idx + 2] * s) >> 8;
        const c2 = (c + tcodes[root + 4 * idx + 3] * s) >> 8;
        const p1 = pixels[r1 * ldim + c1];
        const p2 = pixels[r2 * ldim + c2];
        idx = 2 * idx + (p1 <= p2 ? 1 : 0);
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

export function runCascade(
  image: PicoImage,
  classifyRegion: ClassifyRegionFn,
  params: PicoParams
): Detection[] {
  const { pixels, nrows, ncols, ldim } = image;
  const { shiftfactor, minsize, maxsize, scalefactor } = params;
  let scale = minsize;
  const detections: Detection[] = [];

  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;

    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) {
          detections.push([r, c, scale, q]);
        }
      }
    }
    scale = scale * scalefactor;
  }
  return detections;
}

export function calculateIoU(det1: Detection, det2: Detection): number {
  const [r1, c1, s1] = det1;
  const [r2, c2, s2] = det2;
  const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
  const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
  return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
}

export function clusterDetections(
  dets: Detection[],
  iouThreshold = 0.2
): Detection[] {
  dets.sort((a, b) => b[3] - a[3]);
  const assignments = new Uint8Array(dets.length);
  const clusters: Detection[] = [];

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0, c = 0, s = 0, q = 0, n = 0;
      for (let j = i; j < dets.length; ++j) {
        if (calculateIoU(dets[i], dets[j]) > iouThreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n++;
        }
      }
      clusters.push([r / n, c / n, s / n, q]);
    }
  }
  return clusters;
}
