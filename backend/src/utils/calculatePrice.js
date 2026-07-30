const calculatePrice = ({ weight, parcelType }) => {
  let price = 100;

  // Weight charge
  price += weight * 50;

  // Fragile charge
  if (parcelType === "Fragile") {
    price += 100;
  }

  // Electronics charge
  if (parcelType === "Electronics") {
    price += 50;
  }

  return price;
};

export default calculatePrice;
