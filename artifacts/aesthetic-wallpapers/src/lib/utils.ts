import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function forceDownload(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "aesthetic-wallpaper.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed, opening in new tab", error);
    window.open(url, "_blank");
  }
}

export type DownloadProgressCallback = (progress: number) => void;

export function downloadWithProgress(
  url: string,
  filename: string,
  onProgress: DownloadProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";

    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      } else {
        onProgress(-1);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blobUrl = URL.createObjectURL(xhr.response as Blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Download failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during download"));
    xhr.send();
  });
}

export function buildProxyUrl(imageUrl: string, filename: string, baseUrl: string): string {
  return `${baseUrl}/api/images/download-proxy?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
}
