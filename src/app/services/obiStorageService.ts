import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload an image file to Firebase Storage for O.B.I. ventures
 * @param ventureId - The venture ID to organize files
 * @param file - The image file to upload
 * @param type - The type of image (cover, asset, etc.)
 * @returns Promise<string> - The download URL of the uploaded image
 */
export const uploadVentureImage = async (
  ventureId: string, 
  file: File, 
  type: 'cover' | 'asset' | 'repository' = 'cover'
): Promise<string> => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF files are allowed.');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 10MB.');
  }

  try {
    // Create a unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${ventureId}_${type}_${timestamp}_${randomId}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `obi/${type}s/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
};

/**
 * Upload an asset media file (image or video) to Firebase Storage
 * @param assetId - The asset ID to organize files
 * @param file - The media file to upload
 * @returns Promise<string> - The download URL of the uploaded file
 */
export const uploadAssetMedia = async (assetId: string, file: File): Promise<string> => {
  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (!allAllowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only image and video files are allowed.');
  }

  // Validate file size
  const maxImageSize = 10 * 1024 * 1024; // 10MB for images
  const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos
  
  if (file.type.startsWith('image/') && file.size > maxImageSize) {
    throw new Error('Image file size too large. Maximum size is 10MB.');
  }
  
  if (file.type.startsWith('video/') && file.size > maxVideoSize) {
    throw new Error('Video file size too large. Maximum size is 100MB.');
  }

  try {
    // Create a unique filename
    const fileExtension = file.name.split('.').pop() || 'mp4';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${assetId}_${timestamp}_${randomId}.${fileExtension}`;
    
    // Create storage reference
    const mediaType = file.type.startsWith('image/') ? 'images' : 'videos';
    const storageRef = ref(storage, `obi/assets/${mediaType}/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading asset media:', error);
    throw new Error('Failed to upload media file. Please try again.');
  }
};

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The URL of the image to delete
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl || !imageUrl.includes('firebase')) {
    return; // Skip deletion if not a Firebase URL
  }

  try {
    // Extract the storage path from the URL
    const url = new URL(imageUrl);
    const pathStartIndex = url.pathname.indexOf('/o/') + 3;
    const fullPath = decodeURIComponent(url.pathname.substring(pathStartIndex));
    
    // Create storage reference and delete
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for delete operations to avoid breaking the main flow
  }
};

/**
 * Resize image file before upload (optional utility)
 * @param file - The image file to resize
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - Image quality (0-1)
 * @returns Promise<File> - The resized image file
 */
export const resizeImage = (
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 600, 
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress the image
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            resolve(file); // Return original if resize fails
          }
        },
        file.type,
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const obiStorageService = {
  uploadVentureImage,
  uploadAssetMedia,
  deleteImage,
  resizeImage
};
