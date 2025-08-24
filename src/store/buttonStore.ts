import { atom } from "nanostores";

export const isSaveBtn = atom({
  isView: false,
  handleSave: null,
  isSaving: false,
  editorContent: null,
  title: "",
  saveStatus: "idle",
});
