import { openDB, deleteDB, DBSchema, IDBPDatabase } from "idb";

interface NoteDB extends DBSchema {
  notes: { key: string; value: { noteId: string } };
  links: {
    key: number;
    value: { source: string; target: string };
    indexes: {
      source: string;
      target: string;
      sourceAndTarget: [string, string];
    };
  };
}

export let idb: IDBPDatabase<NoteDB>;

openDB<NoteDB>("notedb", 1, {
  upgrade(idb) {
    const noteStore = idb.createObjectStore("notes", { keyPath: "noteId" });
    const linkStore = idb.createObjectStore("links", { autoIncrement: true });
    linkStore.createIndex("source", "source", { unique: false });
    linkStore.createIndex("target", "target", { unique: false });
    linkStore.createIndex("sourceAndTarget", ["source", "target"], {
      unique: true,
    });
  },
}).then((db) => {
  idb = db;
});

// window.idb = idb;
// window.deleteDB = deleteDB;
