import { startOfDay } from "date-fns";

export const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : "U";
};
