import { useState } from 'react';

/**
 * Modal + form state yönetimi için hook.
 * Add/edit modalleri olan tüm ekranlarda tekrarlanan pattern'i ortadan kaldırır.
 *
 * @param {object} initialForm - Formun başlangıç değerleri (boş/sıfır)
 */
export const useFormModal = (initialForm) => {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setVisible(true);
  };

  const openEdit = (item, toForm) => {
    setEditingId(item.id);
    setForm(toForm ? toForm(item) : item);
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
    setEditingId(null);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return {
    visible,
    form,
    setForm,
    editingId,
    isEditing: editingId !== null,
    openAdd,
    openEdit,
    close,
    updateField,
  };
};
