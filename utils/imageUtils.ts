/**
 * Processes an image file by center-cropping and resizing it to target dimensions.
 * @param file The image file to process.
 * @param targetWidth The desired width of the output image.
 * @param targetHeight The desired height of the output image.
 * @returns A promise that resolves with the new processed image File object in JPEG format.
 */
export const processImage = (file: File, targetWidth: number, targetHeight: number): Promise<File> => {
  // FIX: Explicitly specify the Promise generic type to ensure correct type inference.
  return new Promise<File>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => reject(new Error("Fallo al leer el archivo para procesarlo."));
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = () => reject(new Error("Fallo al cargar la imagen para procesarla."));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error("No se pudo obtener el contexto del canvas."));
        }

        // Center-crop logic
        const { width: imgWidth, height: imgHeight } = img;
        const targetAspectRatio = targetWidth / targetHeight;
        const imgAspectRatio = imgWidth / imgHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = imgWidth;
        let sHeight = imgHeight;

        if (imgAspectRatio > targetAspectRatio) {
          // Image is wider than target, crop width
          sWidth = imgHeight * targetAspectRatio;
          sx = (imgWidth - sWidth) / 2;
        } else if (imgAspectRatio < targetAspectRatio) {
          // Image is taller than target, crop height
          sHeight = imgWidth / targetAspectRatio;
          sy = (imgHeight - sHeight) / 2;
        }
        
        ctx.drawImage(
          img,
          sx, sy, sWidth, sHeight, // source rect
          0, 0, targetWidth, targetHeight // destination rect
        );
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("La conversión de Canvas a Blob falló."));
            }
            // Create a new File object
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/jpeg',
          0.9 // High quality
        );
      };
    };
  });
};

const MAX_ITERATIONS = 6;

/**
 * Redimensiona una imagen al aspecto indicado y reduce la calidad hasta que el tamaño del archivo
 * sea inferior a `maxBytes`.
 * @param file Archivo original.
 * @param targetWidth Ancho objetivo (manteniendo la relación indicada).
 * @param targetHeight Alto objetivo.
 * @param maxBytes Tamaño máximo permitido en bytes.
 * @param mimeType Tipo mime deseado (por defecto image/jpeg).
 */
export const resizeImageToAspect = (
  file: File,
  targetWidth: number,
  targetHeight: number,
  maxBytes: number,
  mimeType: string = 'image/jpeg'
): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => reject(new Error('Fallo al leer el archivo para redimensionarlo.'));
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = () => reject(new Error('Fallo al cargar la imagen para redimensionarla.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas.'));
          return;
        }

        const { width: imgWidth, height: imgHeight } = img;
        const targetAspectRatio = targetWidth / targetHeight;
        const imgAspectRatio = imgWidth / imgHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = imgWidth;
        let sHeight = imgHeight;

        if (imgAspectRatio > targetAspectRatio) {
          sWidth = imgHeight * targetAspectRatio;
          sx = (imgWidth - sWidth) / 2;
        } else if (imgAspectRatio < targetAspectRatio) {
          sHeight = imgWidth / targetAspectRatio;
          sy = (imgHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        const exportBlob = (quality: number) =>
          new Promise<Blob>((resolveBlob, rejectBlob) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  rejectBlob(new Error('No se pudo convertir la imagen redimensionada.'));
                  return;
                }
                resolveBlob(blob);
              },
              mimeType,
              quality
            );
          });

        const compress = async () => {
          let quality = 0.9;
          for (let i = 0; i < MAX_ITERATIONS; i += 1) {
            const blob = await exportBlob(quality);
            if (blob.size <= maxBytes || quality <= 0.3) {
              return blob;
            }
            quality = Math.max(0.3, quality - 0.1);
          }
          return exportBlob(0.3);
        };

        compress().then(resolve).catch(reject);
      };
    };
  });
};

/**
 * Converts a File object to a base64 string.
 * @param file The file to convert.
 * @returns A promise that resolves with an object containing the base64 data and MIME type.
 */
export const fileToBase64 = (file: File): Promise<{ data: string; mime: string }> => {
  // FIX: Explicitly specify the Promise generic type to ensure correct type inference.
  return new Promise<{ data: string; mime: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      resolve({ data, mime });
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
  });
};
