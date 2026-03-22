import api, { type ApiResponse } from "./api";

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive?: boolean;
  subCategories?: Category[];
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data } = await api.get<ApiResponse<Category[]>>("/user/categories");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchCategory(id: string): Promise<Category | null> {
  try {
    const categories = await fetchCategories();
    return categories.find((c) => c.categoryId === id) ?? null;
  } catch {
    return null;
  }
}

export async function fetchSubCategories(parentId: string): Promise<Category[]> {
  try {
    const categories = await fetchCategories();
    const parent = categories.find((c) => c.categoryId === parentId);
    return parent?.subCategories ?? [];
  } catch {
    return [];
  }
}
