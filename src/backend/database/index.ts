import PouchDB from "pouchdb";
import Find from "pouchdb-find";
PouchDB.plugin(Find);
const db = new PouchDB("mydb");

db.createIndex({
  index: {
    fields: [
      "dataType",
      "timestampAdded",
      "projectId",
      "pageNumber",
      "folderIds",
      "children",
      "source",
      "targets",
      "favorite",
    ],
  },
});

// compacting the database
// for details, see https://pouchdb.com/guides/compact-and-destroy.html
db.compact()
  .then((info) => {
    console.log(info);
  })
  .catch((error) => {
    console.log(error);
  });



export { db };
export * from "./models";
