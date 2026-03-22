export type Visibility = "public" | "private";

export interface PublicLibraryRecord {
  public_library_id: string;
  created_at: string;
  updated_at: string;
  editable: boolean;
  is_featured: boolean;
  notes: string | null;
  visibility: string;
  product_id: string;
}

export interface PublicLibraryFormValues {
  product_id: string;
  editable: boolean;
  is_featured: boolean;
  notes: string;
  visibility: Visibility;
}
