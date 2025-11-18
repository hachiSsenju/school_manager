import { Ecole } from "../types";

export const SessionServices = {
  saveUser: (user: any) => {
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("id", JSON.stringify(user?.id));
  },
  getUser: () => {
    return JSON.parse(sessionStorage.getItem("user") || "");
  },
  getUserId: () => {
    return JSON.parse(sessionStorage.getItem("id") || "");
  },
  setSelectedSchool : async (school : any) =>{
     sessionStorage.setItem("school", JSON.stringify(school));
    sessionStorage.setItem("school_id", JSON.stringify(school.id));
  },
   getSchoolId: () => {
    const id = sessionStorage.getItem("school_id");
    return id ? JSON.parse(id) : "";
  },
   getSchool: () => {
    const school = sessionStorage.getItem("school");
    return school ? JSON.parse(school) : "";
  },
};
