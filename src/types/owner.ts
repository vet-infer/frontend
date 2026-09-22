export type DocumentType = "DNI" | "CE" | "PASSPORT";

export type Owner = {
  id: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  document_type?: DocumentType | null;
  document_number?: string | null;
  address?: string;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  ubigeo?: string | null;
  created_at?: string | null;
};

export type OwnerFormValues = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  document_type: DocumentType | "";
  document_number: string;
  address: string;
  department: string;
  province: string;
  district: string;
  ubigeo: string;
};

export type OwnerPayload = {
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  document_type?: DocumentType | null;
  document_number?: string | null;
  address?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  ubigeo?: string | null;
};
