import { defineDb, defineTable, column, NOW } from "astro:db";

const Users = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    fullName: column.text(),
    password: column.text(),
    email: column.text(),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ["email"], unique: true }],
});

export default defineDb({
  tables: {
    users: Users,
  },
});
