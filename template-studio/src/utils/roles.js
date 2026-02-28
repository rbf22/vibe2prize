export function getRoleFromBox(box) {
  if (!box) return 'supporting-text';
  const metadata = box.metadata || {};
  if (box.role) {
    return box.role;
  }
  if (metadata.role) {
    return metadata.role;
  }
  if (Array.isArray(metadata.fieldTypes) && metadata.fieldTypes.length) {
    return metadata.fieldTypes[0];
  }
  if (metadata.type) {
    return metadata.type;
  }
  return 'supporting-text';
}
