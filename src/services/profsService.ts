import {api} from "../api/api";

export const ProfsService = {
    getAllProfs: async () => {
        const response = await api.get("/api/professeurs");
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get(`api/professeurs/${id}`);
        return response.data;
    },
    addProf: async (data: any) => {
        const response = await api.post("/api/professeurs", {
            nom: data?.nom,
            prenom: data?.prenom,
            telephone: data?.telephone,
            ecole_id: data?.ecole_id,
        });
        return response.data;
    },
    updateProf: async (id: string, data: any) => {
        const response = await api.put(`/api/professeurs/edit/${id}`, {
            nom: data?.nom,
            prenom: data?.prenom,
            telephone: data?.telephone,
        });
        return response.data;
    },
    deleteProf: async (id: string) => {
        const response = await api.delete(`/api/professeurs/${id}`);
        return response.data;
    }
}