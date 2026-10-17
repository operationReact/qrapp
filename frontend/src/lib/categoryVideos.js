const videoModules = import.meta.glob("../assets/category-videos/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});

export const CATEGORY_VIDEOS = Object.entries(videoModules)
  .map(([path, src]) => ({ key: path.split("/").pop(), src }))
  .sort((a, b) => a.key.localeCompare(b.key));

const videoSrcByKey = new Map(CATEGORY_VIDEOS.map((video) => [video.key, video.src]));

export const getCategoryVideoSrc = (videoKey) => (videoKey ? videoSrcByKey.get(videoKey) || null : null);

export const MAX_CATEGORY_VIDEO_SECONDS = 3.1;

/** Checks a candidate video is square (1:1) and at most ~3 seconds long. */
export function validateCategoryVideo(src) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      if (video.videoWidth === 0 || video.videoWidth !== video.videoHeight) {
        resolve({ ok: false, message: "Video must be 1:1 (square)" });
      } else if (video.duration > MAX_CATEGORY_VIDEO_SECONDS) {
        resolve({ ok: false, message: "Video must be 3 seconds or less" });
      } else {
        resolve({ ok: true });
      }
    };
    video.onerror = () => resolve({ ok: false, message: "Unable to read this video" });
    video.src = src;
  });
}
