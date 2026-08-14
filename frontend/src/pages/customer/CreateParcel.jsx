import React, { useState } from "react";
import { BaseApi } from "../../main";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
// If you have an action to append the newly created parcel to state, import it here:
// import { addParcel } from "../../redux/slice/parcelSlice";

const CreateParcel = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    parcelType: "",
    weight: "",
    price: "",
    notes: "",
    pickupContact: { name: "", phone: "" },
    pickupLocation: { address: "" },
    deliveryContact: { name: "", phone: "" },
    deliveryLocation: { address: "" },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BaseApi}/parcel/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create parcel");
      }

      // Optional: If you want to update Redux state immediately
      // dispatch(addParcel(data.data));

      // Redirect back to parcels list upon successful creation
      navigate("/parcels"); // Adjust route path as needed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Create New Parcel
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Parcel Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Parcel Type
              </label>
              <input
                type="text"
                name="parcelType"
                value={formData.parcelType}
                onChange={handleChange}
                required
                placeholder="e.g. Electronics, Document"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                required
                placeholder="0.0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Price (Rs.)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                placeholder="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Pickup Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Pickup Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="pickupContact.name"
                  value={formData.pickupContact.name}
                  onChange={handleChange}
                  required
                  placeholder="Sender name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="pickupContact.phone"
                  value={formData.pickupContact.phone}
                  onChange={handleChange}
                  required
                  placeholder="Sender phone"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="pickupLocation.address"
                  value={formData.pickupLocation.address}
                  onChange={handleChange}
                  required
                  placeholder="Pickup address"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Delivery Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Delivery Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="deliveryContact.name"
                  value={formData.deliveryContact.name}
                  onChange={handleChange}
                  required
                  placeholder="Receiver name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="deliveryContact.phone"
                  value={formData.deliveryContact.phone}
                  onChange={handleChange}
                  required
                  placeholder="Receiver phone"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="deliveryLocation.address"
                  value={formData.deliveryLocation.address}
                  onChange={handleChange}
                  required
                  placeholder="Delivery address"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any special handling instructions..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:bg-blue-300"
          >
            {loading ? "Creating Parcel..." : "Create Parcel"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateParcel;
