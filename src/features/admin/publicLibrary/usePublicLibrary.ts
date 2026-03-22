import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import type { PublicLibraryFormValues, PublicLibraryRecord } from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export function usePublicLibrary() {
  const [records, setRecords] = useState<PublicLibraryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("public_library")
      .select("public_library_id,created_at,updated_at,editable,is_featured,notes,visibility,product_id")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(toErrorMessage(fetchError, "Failed to load public library records."));
      setLoading(false);
      return;
    }

    setRecords((data ?? []) as PublicLibraryRecord[]);
    setLoading(false);
  }, []);

  const validateCreateInput = useCallback((values: PublicLibraryFormValues) => {
    const productId = values.product_id.trim();
    if (!productId) throw new Error("product_id is required.");
    if (!UUID_REGEX.test(productId)) throw new Error("product_id must be a valid UUID.");
    if (!values.visibility.trim()) throw new Error("visibility is required.");
  }, []);

  const createRecord = useCallback(async (values: PublicLibraryFormValues) => {
    validateCreateInput(values);
    setSaving(true);
    setError("");

    try {
      const productId = values.product_id.trim();

      const { data: existing, error: existsError } = await supabase
        .from("public_library")
        .select("public_library_id")
        .eq("product_id", productId)
        .limit(1);

      if (existsError) throw existsError;
      if ((existing?.length ?? 0) > 0) {
        throw new Error("product_id already exists. It must be unique.");
      }

      const now = new Date().toISOString();
      const payload = {
        public_library_id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        editable: values.editable,
        is_featured: values.is_featured,
        notes: values.notes.trim() || null,
        visibility: values.visibility,
        product_id: productId,
      };

      const { error: insertError } = await supabase.from("public_library").insert(payload);
      if (insertError) throw insertError;

      await loadRecords();
    } catch (createError) {
      setError(toErrorMessage(createError, "Failed to add record."));
      throw createError;
    } finally {
      setSaving(false);
    }
  }, [loadRecords, validateCreateInput]);

  const updateRecord = useCallback(
    async (
      id: string,
      updates: Pick<PublicLibraryFormValues, "editable" | "is_featured" | "notes" | "visibility">
    ) => {
      if (!updates.visibility.trim()) throw new Error("visibility is required.");

      setSaving(true);
      setError("");

      try {
        const { error: updateError } = await supabase
          .from("public_library")
          .update({
            editable: updates.editable,
            is_featured: updates.is_featured,
            notes: updates.notes.trim() || null,
            visibility: updates.visibility,
            updated_at: new Date().toISOString(),
          })
          .eq("public_library_id", id);

        if (updateError) throw updateError;
        await loadRecords();
      } catch (updateErr) {
        setError(toErrorMessage(updateErr, "Failed to update record."));
        throw updateErr;
      } finally {
        setSaving(false);
      }
    },
    [loadRecords]
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      setSaving(true);
      setError("");

      try {
        const { error: deleteError } = await supabase
          .from("public_library")
          .delete()
          .eq("public_library_id", id);

        if (deleteError) throw deleteError;
        await loadRecords();
      } catch (deleteErr) {
        setError(toErrorMessage(deleteErr, "Failed to delete record."));
        throw deleteErr;
      } finally {
        setSaving(false);
      }
    },
    [loadRecords]
  );

  const featuredCount = useMemo(() => records.filter((r) => r.is_featured).length, [records]);

  return {
    records,
    loading,
    saving,
    error,
    featuredCount,
    setError,
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
