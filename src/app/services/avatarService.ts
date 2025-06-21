import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadAvatar = async (walletAddress: string, file: File): Promise<string | null> => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type.');
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error('File size too large.');
  const fileExtension = file.name.split('.').pop();
  const fileName = `${walletAddress}_${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, `avatars/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export const deleteAvatar = async (avatarUrl: string): Promise<void> => {
  if (!avatarUrl || !avatarUrl.includes('firebase')) return;
  try {
    const url = new URL(avatarUrl);
    const pathStartIndex = url.pathname.indexOf('/o/') + 3;
    const fullPath = decodeURIComponent(url.pathname.substring(pathStartIndex));
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
  } catch (e) {}
};

export const resizeImage = (file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
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
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
};

export const getAvatarOptions = (): string[] => [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=1',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=2',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=3',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=4',
];