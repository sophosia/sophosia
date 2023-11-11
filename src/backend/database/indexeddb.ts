import { openDB } from "idb";

export const idb = await openDB("linkDB", 1, {
  upgrade(idb) {
    const store = idb.createObjectStore("links", { autoIncrement: true });
    store.createIndex("source", "source", { unique: false });
    store.createIndex("target", "target", { unique: false });
  },
});

window.idb = idb;
