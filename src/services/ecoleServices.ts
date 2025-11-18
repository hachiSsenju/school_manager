import { api } from "../api/api";
import { SessionServices } from "./sessionServices";

export const EcoleService = {
  getAll: async (user_id: string) => {
    const response = await api.get(`/api/ecoles/${user_id}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/api/ecoles/id/${id}`);
    return response.data.ecole;
  },
  addSchool: async (nom: string, phone: string, directeur: string) => {
    const response = await api.post(`/api/ecoles`,{
      "nom" : nom,
      "phone" : phone,
      "directeur" : directeur,
      "user_id" : SessionServices.getUserId(),
    });
    return response.data.ecole;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/api/ecoles/edit/${id}`, {
      nom: data?.nom,
    });
    return response;
  },
};
