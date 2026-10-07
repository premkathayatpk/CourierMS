// Driver eligibility for the admin assign pickers (the backend enforces the same rules)
export const canCarry = (driver, parcel) =>
  !driver.maxLoadKg || !parcel || Number(parcel.weight) <= driver.maxLoadKg;

export const canTake = (driver, parcel) => driver.isAvailable && canCarry(driver, parcel);

export const driverOptionLabel = (driver, parcel) => {
  const vehicle = driver.vehicleType || "Bike";
  if (!driver.isAvailable) return `${driver.name} · ${vehicle} · offline`;
  if (!canCarry(driver, parcel)) return `${driver.name} · ${vehicle} · max ${driver.maxLoadKg} kg`;
  const jobs = driver.activeParcels || 0;
  return `${driver.name} · ${vehicle} · ${jobs} active job${jobs === 1 ? "" : "s"}`;
};
