import React from "react";
import ParcelTable from "../../components/customer/ParcelTable";
import { useNavigate } from "react-router-dom";

const Parcel = () => {
  const navigate = useNavigate();
  return (
    <div>
      <div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          onClick={() => {
            navigate("/customer/createParcel");
          }}
        >
          Create Parcel
        </button>
      </div>
      <ParcelTable />
    </div>
  );
};

export default Parcel;
