'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { uploadImage, type UploadResult } from '@/lib/api/projects';
import { Camera, Loader2, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageUploadProps {
    currentImageUrl?: string;
    uploadType: 'users' | 'units' | 'projects';
    onUploadComplete: (url: string) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
};

export function ImageUpload({
    currentImageUrl,
    uploadType,
    onUploadComplete,
    className = '',
    size = 'md',
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        // Show preview immediately
        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);

        try {
            setIsUploading(true);
            const result: UploadResult = await uploadImage(file, uploadType);
            const fullUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${result.url}`;
            setPreviewUrl(fullUrl);
            onUploadComplete(fullUrl);
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload image');
            setPreviewUrl(currentImageUrl || null);
        } finally {
            setIsUploading(false);
            URL.revokeObjectURL(localPreview);
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        onUploadComplete('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
            />

            <div
                className={`${sizeClasses[size]} rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-xs">Upload</span>
                    </div>
                )}
            </div>

            {/* Overlay button for changing image */}
            {previewUrl && !isUploading && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                    >
                        <Camera className="w-4 h-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                        }}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
