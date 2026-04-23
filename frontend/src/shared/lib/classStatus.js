export function isTeachingLockedClassStatus(status) {
  if (status == null) return false;
  const s = String(status).trim().toUpperCase();
  return s === 'INACTIVE' || s === 'ARCHIVED';
}

export function isTeachingActiveClass(cls) {
  return !isTeachingLockedClassStatus(cls?.status);
}
