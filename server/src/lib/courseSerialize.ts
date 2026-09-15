import type { Course } from "@prisma/client";

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
    thumbnailUrl: course.thumbnailUrl,
    authorName: course.authorName,
    authorRole: course.authorRole,
    ...(includeMedia && !locked
      ? { videoUrl: course.videoUrl, body: course.body }
      : { videoUrl: null, body: null }),
  };
}
