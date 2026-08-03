import { supabase } from './supabase';

export async function uploadImage(base64String: string, bucketName: string, path: string): Promise<string | null> {
  if (!base64String || !base64String.startsWith('data:')) return base64String;

  try {
    // Convertir Base64 a Blob
    const base64Data = base64String.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const fileName = `${path}/${Date.now()}.jpg`;

    // Subir a Supabase Storage usando el bucket correspondiente
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error(`Error subiendo imagen al bucket ${bucketName}:`, error);
    return null;
  }
}
