export function getPermissionExpiry(permissionRow) {
  if (
    permissionRow.type === "pulang_tidak_kembali" ||
    permissionRow.category === "sakit"
  ) {
    return null;
  }
  const estimated = permissionRow.estimated_return_time
    ? new Date(permissionRow.estimated_return_time)
    : null;
  if (estimated && !Number.isNaN(estimated.valueOf())) return estimated;

  const departure = permissionRow.departure_time
    ? new Date(permissionRow.departure_time)
    : null;
  if (!departure || Number.isNaN(departure.valueOf())) return null;

  const endOfDay = new Date(departure);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

export function isPermissionExpired(permissionRow, now = new Date()) {
  if (permissionRow.status === "expired") return true;
  if (permissionRow.status !== "approved_piket") return false;
  const expiresAt = getPermissionExpiry(permissionRow);
  return Boolean(expiresAt && now > expiresAt);
}
