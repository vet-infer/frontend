import type { Owner, OwnerPayload } from "../types/owner";
import { api } from "./api";

export const ownerService = {
  async list({ skip = 0, limit = 20 }: { skip?: number; limit?: number } = {}) {
    const response = await api.get<Owner[]>("/api/v1/owners/", { params: { skip, limit } });
    const total = Number(response.headers["x-total-count"] ?? response.data.length);
    return { items: response.data, total };
  },

  async listAll(): Promise<Owner[]> {
    const pageSize = 100;
    const items: Owner[] = [];

    for (let skip = 0; ; skip += pageSize) {
      const { items: page } = await this.list({ skip, limit: pageSize });
      items.push(...page);

      if (page.length < pageSize) {
        return items;
      }
    }
  },

  async getById(ownerId: number) {
    const { data } = await api.get<Owner>(`/api/v1/owners/${ownerId}`);
    return data;
  },

  async create(payload: OwnerPayload) {
    const { data } = await api.post<Owner>("/api/v1/owners/", payload);
    return data;
  },

  async update(ownerId: number, payload: OwnerPayload) {
    const { data } = await api.put<Owner>(`/api/v1/owners/${ownerId}`, payload);
    return data;
  },

  async remove(ownerId: number) {
    await api.delete(`/api/v1/owners/${ownerId}`);
  },
};
