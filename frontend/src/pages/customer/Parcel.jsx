import React, { useEffect } from "react";
import { BaseApi } from "../../main";
import { useDispatch, useSelector } from "react-redux";
import { setParcel } from "../../redux/slice/parcelSlice";

const Parcel = () => {
  const { parcel } = useSelector((state) => state.parcel);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        const res = await fetch(`${BaseApi}/parcel/myParcel`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch parcels");
        }

        const data = await res.json();

        dispatch(setParcel(data.data));
      } catch (error) {
        console.log(error);
      }
    };

    fetchParcel();
  }, [dispatch]);

  const statusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-700";

      case "Assigned":
        return "bg-indigo-100 text-indigo-700";

      case "Picked Up":
        return "bg-blue-100 text-blue-700";

      case "In Transit":
        return "bg-purple-100 text-purple-700";

      case "Delivered":
        return "bg-green-100 text-green-700";

      case "Cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">My Parcels</h1>

      {parcel?.length === 0 ? (
        <div className="text-center text-gray-500">No parcels found.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {parcel.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">{item.parcelType}</h2>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor(
                    item.status,
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="space-y-3 text-gray-700">
                <div>
                  <p className="font-semibold">Pickup</p>
                  <p>{item.pickupContact.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.pickupLocation.address}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Delivery</p>
                  <p>{item.deliveryContact.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.deliveryLocation.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p>{item.weight} kg</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p>Rs. {item.price}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created</p>

                  <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>

                {item.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>

                    <p>{item.notes}</p>
                  </div>
                )}
              </div>

              <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 transition">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Parcel;
