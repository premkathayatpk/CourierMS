import React from "react";
import ParcelTable from "../../components/customer/ParcelTable";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Package } from "lucide-react";

const CustomerParcelsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-brand-600" />
            My Shipments
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Monitor all your delivery orders, live courier routes, and completion statuses.
          </p>
        </div>

        <button
          onClick={() => navigate("/customer/createParcel")}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 text-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Book Parcel
        </button>
      </div>

      <ParcelTable />
    </div>
  );
};

export default CustomerParcelsPage;
