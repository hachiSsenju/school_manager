import { api } from "../api/api";

export const financesService = {
    getAllByClasseId: async (classe_id: any) => {
        const response = await api.get(`/api/finances/classe/${classe_id}`);
        return response.data;
    },
    getAllByEcoleID: async (ecole_id: any) => {
        const response = await api.get(`/api/finances/global/ecole/${ecole_id}`);
        return response.data;
    }
}