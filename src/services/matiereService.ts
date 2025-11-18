import {api} from "../api/api";

export const MatiereService = {
    getAllMatieres: async () => {
        const response = await api.get("/api/matieres");
        return response.data;
    },
    getById: async (id: number) => {
        const response = await api.get(`api/matieres/${id}`);
        return response.data;
    }
    ,
    addMatiere: async (data: any) => {
        const response = await api.post("/api/matieres", { 
            nom: data?.nom,
            description: data?.description,
            coefficient: data?.coefficient,
            professeur_id: data?.professeur_id,
            ecole_id: data?.ecole_id,
            classe_id: data?.classe_id,
        });
        return response.data;
    },
    updateMatiere: async (id: number, data: any) => {
        const response = await api.put(`/api/matieres/edit/${id}`, {
            nom: data?.nom,
            description: data?.description,
            coefficient: data?.coefficient,
            professeur_id: data?.professeur_id,
            classe_id: data?.classe_id,
        });
        return response.data;
    },
    deleteMatiere: async (id: number) => {
        const response = await api.delete(`/api/matieres/${id}`);
        return response.data;
    }
}

