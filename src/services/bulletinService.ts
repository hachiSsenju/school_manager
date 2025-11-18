import { api } from "../api/api";
import { SessionServices } from "./sessionServices";

export const BulletinService = {
  getAllBulletins: async () => {
    const response = await api.get("/api/bulletins");
    return response.data;
  },
  getBulletinById: async (id: string) => {
    const response = await api.get(`/api/bulletins/${id}`);
    return response.data;
  },
  createBulletin: async (
    eleve_id: string | undefined,
    classe_id: string | undefined,
    // ecole_id: string | undefined,
    annee_scolaire: string | undefined,
    date: string | undefined
  ) => {
    const response = await api.post("/api/bulletins", {
      eleve_id: eleve_id,
      classe_id: classe_id,
      ecole_id: SessionServices.getSchoolId(),
      annee_scolaire: annee_scolaire,
      date: date,
    });
    return response.data;
  },
  updateBulletin: async (id: string, data: any) => {
    const response = await api.put(`/api/bulletins/${id}`, data);
    return response.data;
  },
  deleteBulletin: async (id: string) => {
    const response = await api.delete(`/api/bulletins/${id}`);
    return response.data;
  },
  getBulletinsByStudentAndSemeterId: async (
    studentId: string,
    trimesterId: string
  ) => {
    const response = await api.post(`/api/bulletins/trimester/${trimesterId}`, {
      eleve_id: studentId,
    });
    return response.data;
  },
  getByClasse: async (classe_id: any) => {
    const response = await api.get(`/api/bulletins/classe/${classe_id}`);
    return response.data;
  },
  getByEleve: async (eleve_id: any) => {
    const response = await api.get(`/api/bulletins/eleve/${eleve_id}`);
    return response.data;
  },
  getByEleveAndClasse : async (eleve_id: any, classe_id: any) => {
    const response = await api.get(`/api/bulletins/eleve/classe/${eleve_id}/${classe_id}`);
    return response.data;
  },
};
