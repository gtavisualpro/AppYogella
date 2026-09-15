import type { Course } from "@prisma/client";
import { youtubeThumbnail, youtubeEmbedUrl } from "./youtube.js";

export function courseMeta(course: Pick<Course, "universe" | "durationMin">) {
  return `${course.universe} · ${course.durationMin} min`;
}

export function serializeCourse(
  course: Course,
  hasAccess: boolean,
  opts: { includeMedia?: boolean } = {}
) {
  const locked = course.premium && !hasAccess;
  const includeMedia = opts.includeMedia ?? false;
  return {
    id: course.id,
    title: course.title,
    kind: course.kind,
    universe: course.universe,
    category: course.category,
    durationMin: course.durationMin,
    meta: `${course.durationMin} min`,
    premium: course.premium,
    locked,
    // Vignette explicite si elle existe, sinon celle de YouTube — c'est ce qui
    // permet à l'admin de « laisser l'image de YouTube » sans rien téléverser.
    thumbnailUrl: course.thumbnailUrl ?? (course.youtubeId ? youtubeThumbnail(course.youtubeId) : null),
    authorName: course.authorName,
    authorRole: course.authorRole,
    ...(includeMedia && !locked
      ? {
          videoUrl: course.videoUrl,
          youtubeEmbedUrl: course.youtubeId ? youtubeEmbedUrl(course.youtubeId) : null,
          body: course.body,
        }
      : { videoUrl: null, youtubeEmbedUrl: null, body: null }),
  };
}
