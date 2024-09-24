import { readBinaryFile } from "@tauri-apps/api/fs";
import { Body, getClient, ResponseType } from "@tauri-apps/api/http";
import { getSupabaseClient } from "src/backend/authSupabase/supabaseClient";
import { useProjectStore } from "src/stores/projectStore";
import { getProject } from "../project";
import { projectFileAGUD } from "../project/fileOps";
import { retrieveCategoryId, retrieveReferenceId } from "./retrieveDBInfo";

const uploadURL = import.meta.env.VITE_UPLOAD_URL;
const supabase = getSupabaseClient();

/**
 * Check if the reference or category is uploaded to the server
 *
 * @param itemId  the id of the project or category
 * @param type the type of the id (reference or category)
 * @returns { status: boolean; error?: string }
 */
export async function checkIfUploaded(
  itemId: string,
  type: string
): Promise<{ status: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      return { status: false, error: "You need to login first :)" };
    }
    if (type === "reference") {
      console.log("itemid", itemId);
      const project = await getProject(itemId);
      if (!project) {
        return { status: false, error: "Project not found" };
      }
      const referenceId = await retrieveReferenceId(supabase, project.label);
      if (!referenceId) {
        return { status: false, error: "Reference not found" };
      }
    } else if (type === "category") {
      const categoryId = await retrieveCategoryId(supabase, itemId);
      if (!categoryId) {
        return { status: false, error: "Category not found" };
      }
    }
  } catch (error) {
    console.error("Error in checkIfUploaded:", error);
    return {
      status: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return { status: true };
}

export async function uploadPDF(
  projectId: string
): Promise<{ status: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      return { status: false, error: "You need to login first :)" };
    }

    const projectStore = useProjectStore();
    const project = await projectStore.getProjectFromDB(projectId);
    const filePath = await projectFileAGUD.getPDF(projectId);
    const fileName = project?.label;
    const categories = project?.categories;
    console.log("Filenmae", fileName);
    console.log(JSON.stringify(categories));

    if (!filePath || !fileName) {
      return { status: false, error: "File path or name is missing" };
    }

    const fileBuffer = await readBinaryFile(filePath);
    const client = await getClient();

    try {
      const response = await client.request({
        headers: { "Content-Type": "multipart/form-data" },
        method: "POST",
        url: uploadURL,
        body: Body.form({
          file: {
            file: fileBuffer,
            fileName: fileName,
            mime: "application/pdf",
          },
          user_uuid: userId,
          folder: JSON.stringify(categories),
        }),
        responseType: ResponseType.Text,
      });

      console.log("Response Status:", response.status);
      console.log("Response Headers:", response.headers);
      console.log("Response Data:", response.data);
    } catch (error) {
      console.error("HTTP Request Error:", error);
      throw error;
    }
    return { status: true };
  } catch (error) {
    console.error("Error in uploadPDF:", error);
    return {
      status: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
