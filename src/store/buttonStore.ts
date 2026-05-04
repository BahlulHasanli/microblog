import { atom } from "nanostores";

export const isSaveBtn = atom({
  isView: false,
  handleSave: null as (() => void | Promise<void>) | null,
  handleSaveDraft: null as (() => void | Promise<void>) | null,
  isSaving: false,
  editorContent: null,
  title: "",
  saveStatus: "idle",
  isDisabled: false,
});
