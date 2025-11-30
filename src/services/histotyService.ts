import { api } from "../api/api";

export const HistoryServices = {
    getAllByEcoleId: async (ecoleId: string) => {
        const response = await api.get(`/api/histories/${ecoleId}`);
        return response.data;
    }
}