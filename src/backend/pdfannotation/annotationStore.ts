import { reactive, ref } from "vue";
import { AnnotationData, AnnotationType, db } from "../database";
import { Annotation, Ink } from "./annotations";

/**
 * Use this to communicate with database
 */
export default class AnnotationStore {
  projectId: string;
  annots = reactive<Annotation[]>([]);
  _selectedId = ref<string>("");

  get selectedId() {
    return this._selectedId.value;
  }
  set selectedId(id: string) {
    this._selectedId.value = id;
  }
  get selected() {
    return this.getById(this.selectedId);
  }

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Save annotData to db and push it to annots list
   * @param annot
   * @param saveToDB
   */
  async add(annot: Annotation, saveToDB?: boolean) {
    if (saveToDB) {
      await annot.save();
    }
    if (!this.getById(annot.data._id)) this.annots.push(annot);
  }

  /**
   * Update annotData in db, the annot object in the list will be updated automatically
   * @param annotId
   * @param props
   */
  async update(annotId: string, props: AnnotationData) {
    const annot = this.getById(annotId);
    if (annot) await annot.update(props);
  }

  /**
   * Delete annotData in db and remove it from annots list
   * @param annotId
   */
  async delete(annotId: string) {
    const ind = this.annots.findIndex((annot) => annot.data._id === annotId);
    if (ind > -1) {
      const annot = this.annots[ind];
      await annot.delete();
      this.annots.splice(ind, 1);
    }
  }

  /**
   * Load and return annotDatas from db
   * @returns annotDatas
   */
  async loadFromDB() {
    try {
      // get all annotations of the currentry {
      const annotDatas = (
        await db.find({
          selector: { dataType: "pdfAnnotation", projectId: this.projectId }
        })
      ).docs as AnnotationData[];

      // TODO: remove this few more versions later
      let flag = false;
      for (const annotData of annotDatas)
        if (!annotData.timestampAdded) {
          annotData.timestampAdded = Date.now();
          annotData.timestampModified = Date.now();
          flag = true;
        }
      if (flag) {
        const responses = await db.bulkDocs(annotDatas);
        for (const i in responses) {
          const rev = responses[i].rev;
          if (rev) annotDatas[i]._rev = rev;
        }
      }

      return annotDatas;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  getByPage(pageNumber: number) {
    return this.annots.filter((annot) => annot.data.pageNumber === pageNumber);
  }

  getById(annotId: string) {
    return this.annots.find((annot) => annot.data._id === annotId);
  }

  getInk(pageNumber: number) {
    return this.annots.find(
      (annot) =>
        annot.data.pageNumber === pageNumber &&
        annot.data.type === AnnotationType.INK
    ) as Ink | undefined;
  }

  setActive(annotId: string) {
    this.selectedId = annotId;
    for (const annot of this.annots) {
      annot.setActive(false);
      if (annot.data._id === annotId) annot.setActive(true);
    }
  }
}
