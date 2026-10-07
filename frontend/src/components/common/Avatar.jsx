import { fileUrl } from "../../config";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-14 w-14 text-xl",
  lg: "h-20 w-20 text-2xl",
};

// Profile photo, or the first letter of the name when there is none
const Avatar = ({ user, size = "sm", className = "" }) => {
  const sizeClass = SIZES[size] || SIZES.sm;
  if (user?.avatar) {
    return (
      <img
        src={fileUrl(user.avatar)}
        alt={user.name || "Profile photo"}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold uppercase text-white ${className}`}
    >
      {user?.name?.charAt(0) || "U"}
    </div>
  );
};

export default Avatar;
