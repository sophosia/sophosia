import { getSupabaseClient } from "src/backend/authSupabase/supabaseClient";
import { getPDF } from "../project/project";
import { useProjectStore } from "src/stores/projectStore";
import { readBinaryFile } from '@tauri-apps/api/fs';
import { getClient, Body, ResponseType } from '@tauri-apps/api/http';

const uploadURL = import.meta.env.VITE_UPLOAD_URL;
const supabase = getSupabaseClient();

export async function uploadPDF(projectId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
        throw new Error("User not authenticated");
    }

    const projectStore = useProjectStore();
    const project = await projectStore.getProjectFromDB(projectId);
    const filePath = await getPDF(projectId);
    const fileName = project?.label;
    const folders = project?.folderIds;

    console.log("File Path:", filePath);
    console.log("File Name:", fileName);
    console.log("Folders:", folders);
    console.log("Project:", project);

    if (filePath && fileName) {
        try {
            const fileBuffer = await readBinaryFile(filePath);
            const file = new File([fileBuffer], fileName, { type: 'application/pdf' });
            console.log("File Buffer Length:", fileBuffer.byteLength);

            const client = await getClient();

            const uploadFile = async (folderId: string) => {
                const formData = new FormData();
                formData.append('file', new Blob([fileBuffer]), fileName);
                formData.append('user_uuid', userId);
                formData.append('folder', folderId);

                console.log("Uploading to URL:", uploadURL);

                try {
                    const response = await client.request({
                        method: 'POST',
                        url: uploadURL,
                        body: Body.form(formData), // This method should be used for `multipart/form-data`
                        responseType: ResponseType.Text,
                    });

                    console.log("Response Status:", response.status);
                    console.log("Response Headers:", response.headers);
                    console.log("Response Data:", response.data);

                    return response;
                } catch (error) {
                    console.error("HTTP Request Error:", error);
                    throw error;
                }
            };

            if (folders && folders.length > 0) {
                for (const folderId of folders) {
                    console.log("Uploading for folder:", folderId);
                    await uploadFile(folderId);
                }
            } else {
                console.log("Uploading without folder");
                await uploadFile("");
            }
        } catch (error) {
            console.error("Error in uploadPDF:", error);
        }
    } else {
        console.error("File path or name is missing");
    }
}
