/**
 * Compresses and resizes an image file.
 * @param file The original File object.
 * @param maxWidth The maximum width for the image. Defaults to 1280px.
 * @param quality The quality (0 to 1) for JPEG compression. Defaults to 0.8.
 * @returns A Promise resolving to the optimized File object.
 */
export const optimizeImage = (file, maxWidth = 1280, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        // If not an image, return original
        if (!file.type.match(/image.*/)) {
            resolve(file);
            return;
        }
        // If it's an SVG or very small, return original
        if (file.type === 'image/svg+xml' || file.size < 200 * 1024) { // < 200KB
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.src = readerEvent.target.result;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                let width = image.width;
                let height = image.height;
                // Calculate new dimensions
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file); // Fallback
                    return;
                }
                // Draw image on canvas
                ctx.drawImage(image, 0, 0, width, height);
                // Determine output format
                // We preserve PNG transparency if original is PNG, though file size reduction is less effective
                const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    // If the optimized blob is actually larger than original, return original
                    if (blob.size > file.size) {
                        resolve(file);
                        return;
                    }
                    const optimizedFile = new File([blob], file.name, {
                        type: mimeType,
                        lastModified: Date.now(),
                    });
                    resolve(optimizedFile);
                }, mimeType, quality);
            };
            image.onerror = () => resolve(file); // Fallback on error
        };
        reader.onerror = () => resolve(file);
    });
};
