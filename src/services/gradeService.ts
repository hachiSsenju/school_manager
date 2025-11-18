import {api} from '../api/api';

export const GradeService = {
    getAll : async () => {
        const response = await api.get('/api/grades');
        return response.data;
    },
    getById : async (id: string) => {
        const response = await api.get(`/api/grades/${id}`);
        return response.data;
    },
    addGrade: async (data: any) => {
        // Backend updates on POST when an id is provided
        const response = await api.post('/api/gradesH', {
            id: data?.id, // optional for update
            note: data?.note,
            matiere_id: data?.matiere_id,
            type: data?.type,
            date: data?.date,
            cycle_id: data?.cycle_id,
        });
        return response.data;
    },
    updateGrade: async (_id: string, data: any) => {
        // Keep compatibility: perform POST with id in body
        const response = await api.post('/api/grades', {
            id: data?.id ?? _id,
            eleve_id: data?.eleve_id ?? data?.student_id,
            matiere_id: data?.matiere_id,
            note: data?.note,
            type_examen: data?.type_examen || data?.type,
            date: data?.date,
            trimester_id : data?.trimester_id,
            bulletin_id : data?.bulletin_id,
            cycle_id: data?.cycle_id,
        });
        return response.data;
    },
    deleteGrade: async (id: string) => {
        const response = await api.delete(`/api/grades/delete/${id}`);
        return response.data;
    },
    addGradeP : async (data: any) => {
        const response = await api.post('/api/gradesP', {
            note: data?.note,
            date: data?.date,
            matiere_id: data?.matiere_id,
            id: data?.id,
            mois_id : data?.mois_id
        }
        );
        return response.data;
    },
    deleteGradeP : async (id: string) => {
        const response = await api.delete(`/api/gradesP/delete/${id}`);
        return response.data;
    },
    deleteGradeH : async (id: string) => {
        const response = await api.delete(`/api/gradesP/delete/${id}`);
        return response.data;
    }
};