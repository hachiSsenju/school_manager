import { api } from '../api/api';

export interface MoyenneEntry {
    eleve_id: number;
    cycle_id: number;
    value: number | null;
    classe_nom: string;
    rank: number;
}

export interface CycleData {
    cycle_position: number;
    entries: MoyenneEntry[];
}

export interface MoyennesByClasseResponse {
    cycles: CycleData[];
}

export const MoyenneService = {
 addMoyenne: async (data: any) => {
     const response = await api.post('/api/moyenne', {
         cycle_id: data?.cycle_id,
         value: data?.value,
     });
     return response.data;
 },
//  addMoyenneP: async (data: any) => {
//      const response = await api.post('/api/moyenne', {
//          cycle_id: data?.cycle_id,
//          value: data?.value,
//      });
//      return response.data;
//  },
  getAllByClasseId: async (classe_id: any): Promise<MoyennesByClasseResponse> => {
     const response = await api.get(`/api/moyenne/classe/${classe_id}`, {
     });
     return response.data;
 }
};

