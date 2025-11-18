import { api} from "../api/api";

export const ClasseService = {
    getAllClasses: async () => {
        const response = await api.get("/api/classes");
        return response.data;
    },
    getById: async (id: number) => {
        const response = await api.get(`api/classes/${id}`);
        return response.data;
    },
    addClasse: async (data: any) => {
        const response = await api.post("/api/classes", {
            nom: data?.nom,
            niveau: data?.niveau,
            frais: data?.frais,
            ecole_id: data?.ecole_id,
            responsables: data?.responsables
        });
        return response.data;
    },
    updateClasse: async (id: number, data: any) => {
        const response = await api.put(`/api/classes/edit/${id}`, {
            nom: data?.nom,
            niveau: data?.niveau,
            frais: data?.frais,
            responsables: data?.responsables
        });
        return response.data;
    },
    deleteClasse: async (id: number) => {
        const response = await api.delete(`/api/classes/delete/${id}`);
        return response.data;
    },
    getMatieresByClasse: async (classeId: number) => {
        const response = await api.get(`/api/classes/matieres/${classeId}`);
        return response.data;
    },
    getEverythingByUserId: async (user_id: string) => {
        const response = await api.get(`/api/ecoles/${user_id}`, 
            // { params: { user_id } }
        );
        console.log(response)
        return response.data;
    }
}