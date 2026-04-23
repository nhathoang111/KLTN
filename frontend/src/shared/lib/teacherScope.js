function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isActiveSection(section) {
  const status = String(section?.status || '').trim().toUpperCase();
  return !status || status === 'ACTIVE';
}

export function teacherClassIdsFromSections(classSections = []) {
  const ids = new Set();
  classSections.forEach((cs) => {
    if (!isActiveSection(cs)) return;
    const classId = toNumber(cs?.classRoom?.id ?? cs?.class_room?.id);
    if (classId != null) ids.add(classId);
  });
  return ids;
}

export function teacherSubjectIdsFromSections(classSections = []) {
  const ids = new Set();
  classSections.forEach((cs) => {
    if (!isActiveSection(cs)) return;
    const subjectId = toNumber(cs?.subject?.id ?? cs?.subject_id);
    if (subjectId != null) ids.add(subjectId);
  });
  return ids;
}

export function teacherSubjectIdsByClassFromSections(classSections = []) {
  const map = new Map();
  classSections.forEach((cs) => {
    if (!isActiveSection(cs)) return;
    const classId = toNumber(cs?.classRoom?.id ?? cs?.class_room?.id);
    const subjectId = toNumber(cs?.subject?.id ?? cs?.subject_id);
    if (classId == null || subjectId == null) return;
    if (!map.has(classId)) map.set(classId, new Set());
    map.get(classId).add(subjectId);
  });
  return map;
}

export function buildTeacherVisibleClasses({
  allClasses = [],
  classSections = [],
  teacherId,
  schoolId,
  includeHomeroom = true,
}) {
  const idsFromSections = teacherClassIdsFromSections(classSections);
  const out = allClasses.filter((cls) => {
    const classId = toNumber(cls?.id);
    const classSchoolId = toNumber(cls?.school?.id ?? cls?.school_id);
    if (schoolId != null && classSchoolId !== schoolId) return false;
    const sectionAssigned = classId != null && idsFromSections.has(classId);
    if (sectionAssigned) return true;
    if (!includeHomeroom) return false;
    const homeroomTeacherId = toNumber(cls?.homeroomTeacher?.id ?? cls?.homeroomTeacherId);
    return homeroomTeacherId != null && homeroomTeacherId === teacherId;
  });
  return out;
}
