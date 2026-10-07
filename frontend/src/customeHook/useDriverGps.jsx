import { createContext, useContext } from "react";

// Live GPS shared across the driver portal (provided by DriverGpsProvider)
export const DriverGpsContext = createContext(null);

const useDriverGps = () => {
  const ctx = useContext(DriverGpsContext);
  if (!ctx) throw new Error("useDriverGps must be used inside DriverGpsProvider");
  return ctx;
};

export default useDriverGps;
