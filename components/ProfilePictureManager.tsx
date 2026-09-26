'use client';

import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Trash2, Upload, User, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProfilePictureManagerProps {
  userAddress: string;
  currentProfilePicture?: string;
  userName?: string;
}

export function ProfilePictureManager({
  userAddress,
  currentProfilePicture,
  userName,
}: ProfilePictureManagerProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfilePicture = useMutation(api.users.updateProfilePicture);
  const removeProfilePicture = useMutation(api.users.removeProfilePicture);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userAddress', userAddress);

      const response = await fetch('/api/profile-picture/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      await updateProfilePicture({
        address: userAddress,
        profilePictureUrl: result.url,
      });

      toast.success('Profile picture updated successfully!');
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to upload profile picture',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeProfilePicture({ address: userAddress });
      toast.success('Profile picture removed');
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const currentImage = previewUrl || currentProfilePicture;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-1 h-auto w-auto rounded-full hover:bg-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={currentProfilePicture}
              alt={userName || userAddress}
            />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
            <Camera className="h-3 w-3" />
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new profile picture. Supported formats: JPG, PNG, GIF, WebP
            (max 5MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={currentImage} alt="Profile preview" />
                <AvatarFallback className="text-2xl">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              {previewUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {selectedFile && (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(selectedFile.size / 1024)}KB
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={triggerFileSelect}
              disabled={isUploading}
              className="w-full h-12 border-dashed border-2"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              {selectedFile ? 'Choose Different Image' : 'Choose Image'}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {currentProfilePicture && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isUploading}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
