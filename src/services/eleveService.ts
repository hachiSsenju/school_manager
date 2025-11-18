import { api } from "../api/api";

export const EleveService = {
  getAllEleves: async () => {
    const response = await api.get("/api/eleves");
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`api/eleves/${id}`);
    return response.data;
  },
  addEleve: async (data: any) => {
    const response = await api.post("/api/eleves", {
        nom: data?.nom,
        prenom: data?.prenom,
        birthday: data?.birthday,
        birthplace: data?.birthplace,
        sexe: data?.sexe,
        matricule: data?.matricule,
        solde_initial: data?.solde_initial,
        classe_id: data?.classe_id,
        email_parent: data?.email_parent,
        ecole_id: data.ecole_id,
      });
    return response.data;
  },
  updateEleve: async (id: number, data: any) => {
    const response = await api.put(`/api/eleves/edit/${id}`, {
        nom: data?.nom,
        prenom: data?.prenom,
        birthday: data?.birthday,
        birthplace: data?.birthplace,
        sexe: data?.sexe,
        solde_initial: data?.solde_initial,
        classe_id: data?.classe_id,
        email_parent: data?.email_parent,
    });
    return response.data;
  },
  deleteEleve: async (id: number) => {
    const response = await api.delete(`/api/eleves/delete/${id}`);
    return response.data;
  },
  transfert : async (id: string, newClasseId: string) => {
    const response = await api.post(`/api/eleves/transfert/${id}`, {
        new_classe: newClasseId
    });
    return response.data;
  },
  getByClasseId : async (classe_id: any) =>{
    const response = await api.get(`api/eleves/classe/${classe_id}`);
    return response.data;
  },
  getClasseByStudentId : async (student_id : any) =>{
     const response = await api.get(`api/classe/eleve/${student_id}`);
    return response.data;
  }
}