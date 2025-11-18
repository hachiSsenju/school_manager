import { api } from "../api/api";
import { SessionServices } from "./sessionServices";

export const AuthService = {
  isLoggedIn: () => {
    if (sessionStorage.getItem("access_token")) {
      return true;
    }
    return false;
  },
  login: async (email: string, password: string) => {
    const response = await api.post("api/login", {
      email: email,
      password: password,
    },
);
    return response.data;
  },
  me : async ()=>{
    const response = await api.get('api/me');
    return response.data;
  },
  register : async (data : any )=>{

    const response = await api.post("register", {
      nom: data?.nom,
      prenom: data?.prenom,
      telephone: data?.telephone,
      role_user: data?.role_user,
      email: data?.email,
      password: data?.password,
    });
    return response.data;
  },
  logout: () => {
    sessionStorage.clear();
    window.location.reload();
  }
};
