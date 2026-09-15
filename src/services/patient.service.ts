import type { Breed, Patient, PatientPayload, Species } from "../types/patient";
import { api } from "./api";

export const patientService = {
  async list({ skip = 0, limit = 20 }: { skip?: number; limit?: number } = {}) {
    const response = await api.get<Patient[]>("/api/v1/patients", { params: { skip, limit } });
    const total = Number(response.headers["x-total-count"] ?? response.data.length);
    return { items: response.data, total };
  },

  async listAll(): Promise<Patient[]> {
    const pageSize = 100;
    const items: Patient[] = [];

    for (let skip = 0; ; skip += pageSize) {
      const { items: page } = await this.list({ skip, limit: pageSize });
      items.push(...page);

      if (page.length < pageSize) {
        return items;
      }
    }
  },

  async getById(patientId: number) {
    const { data } = await api.get<Patient>(`/api/v1/patients/${patientId}`);
    return data;
  },

  async create(payload: PatientPayload) {
    const { data } = await api.post<Patient>("/api/v1/patients", payload);
    return data;
  },

  async update(patientId: number, payload: PatientPayload) {
    const { data } = await api.put<Patient>(`/api/v1/patients/${patientId}`, payload);
    return data;
  },

  async listSpecies() {
    const { data } = await api.get<Species[]>("/api/v1/species");
    return data;
  },

  async listBreeds(speciesId?: number) {
    const pageSize = 100;
    const breeds: Breed[] = [];

    for (let skip = 0; ; skip += pageSize) {
      const { data } = await api.get<Breed[]>("/api/v1/breeds", {
        params: { ...(speciesId ? { species_id: speciesId } : {}), limit: pageSize, skip },
      });
      breeds.push(...data);

      if (data.length < pageSize) {
        return breeds;
      }
    }
  },

  async remove(patientId: number): Promise<void> {
    await api.delete(`/api/v1/patients/${patientId}`);
  },
};

