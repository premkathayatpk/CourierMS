// Fleet rules used by driver assignment (auto and manual).
// Edit these numbers to tune dispatch; the logic lives in src/services/algorithms/driverAssignment.js.
export const FLEET = {
  // Heaviest parcel each vehicle type may carry (kg)
  vehicleMaxKg: {
    Bike: 20,
    Car: 100,
    Van: 500,
    Truck: 1000,
  },
  // A driver at this many active parcels gets no more auto-assigned jobs
  maxActiveJobs: 5,
  // Extra "cost" per active parcel, in seconds of travel time
  jobPenaltySeconds: 10 * 60,
  // How many nearest (straight-line) drivers get an A* road-time check
  shortlistSize: 5,
  // GPS older than this means the driver's app is closed: skip them
  locationMaxAgeMinutes: 15,
  // Background retry for parcels still waiting for a driver
  pendingSweepSeconds: 30,
  pendingSweepBatch: 20,
};
