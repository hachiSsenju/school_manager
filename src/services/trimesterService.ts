import { api } from "../api/api";

export const TrimesterServices = {
  getById: async (id: string) => {
    const response = await api.get(`/api/trimester/${id}`);
    return response.data;
  },
};
