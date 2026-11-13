// id урока содержит "/" и ":", поэтому в адресе страницы он хранится в безопасном виде.
export const lessonSlug = (id: string) => id.replace(/\//g, "~");
export const lessonFromSlug = (slug: string) => decodeURIComponent(slug).replace(/~/g, "/");
export const trackSlug = (id: string) => encodeURIComponent(id);
export const trackFromSlug = (slug: string) => decodeURIComponent(slug);
