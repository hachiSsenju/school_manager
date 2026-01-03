import { api } from "../api/api";
import { SessionServices } from "./sessionServices";

export const paymentService = {
  addPayment:  async (paymentData: any)  =>  {
    const response =  await api.post("/api/payment", {
      user_id: paymentData.user_id ?? SessionServices.getUserId(),
      somme: paymentData.somme,
      type: paymentData.motif ?? paymentData.type,
      motif: paymentData.motif ?? paymentData.type,
      date: paymentData.date ?? new Date().toISOString(),
      trimestre: paymentData.trimestre ?? null,
      eleve_id: paymentData.eleve_id ?? null,
      description: paymentData.description ?? "aucune descrition fournie",
      classe_id: paymentData.classesId ?? null,
      prof_id: paymentData.prof_id ?? null,
      ecole_id: paymentData.ecole_id ?? SessionServices.getSchoolId(),
    });
    return response.data;
  },
  getAllPayments: async () => {
    const ecole_id = SessionServices.getSchoolId();
    const response = await api.get(`/api/payment/${ecole_id}`);
    return response.data;
  },
  getbyId: async (id : any) => {
    const response = await api.get(`/api/payment/id/${id}`);
    return response.data;
  },
//   getAllPaymentsByClasseId: async (ecole_id : any) => {
//     const response = await api.get(`/api/payment/${ecole_id}`);
//     return response.data;
//   },
  updatePayment: async (id: string, paymentData: any) => {
    const response = await api.put(`/api/payment/edit/${id}`, {
      somme: paymentData.somme,
      type: paymentData.motif ?? paymentData.type,
      motif: paymentData.motif ?? paymentData.type,
      date: paymentData.date ?? new Date().toISOString(),
      eleve_id: paymentData.eleve_id ?? null,
      description: paymentData.description ?? "aucune descrition fournie",
      classe_id: paymentData.classesId ?? null,
      prof_id: paymentData.prof_id ?? null,
      trimestre: paymentData.trimestre ?? null,
    });
    return response.data;
  },
  deletePayment: async (id: string) => {
    const response = await api.delete(`/api/payment/delete/${id}`);
    return response.data;
  },
};
