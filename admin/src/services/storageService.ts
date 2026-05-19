export async function uploadFile(file: File, _folder?: string): Promise<string> {
  // Convert file to base64
  const fileData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:mime/type;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Use main API endpoint for upload
  const response = await fetch('/api/upload-story', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileData,
      fileName: file.name,
      mimeType: file.type,
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }

  return result.url;
}
