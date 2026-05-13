// src/modules/file-upload.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cloudinary } from '../../service/cloudinary.config';

@Injectable()
export class FileUploadService {
  async uploadImage(file: Express.Multer.File): Promise<string> {
    const configuredCloudinary = this.getConfiguredCloudinary();

    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const publicId = `${Date.now()}-${uuidv4()}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = configuredCloudinary.uploader.upload_stream(
        {
          folder: this.uploadFolder,
          resource_type: 'image',
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
          overwrite: false,
          format: this.resolveImageExtension(file.originalname),
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(
              error ??
                new InternalServerErrorException(
                  'Cloudinary upload did not return a result',
                ),
            );
            return;
          }

          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });

    return result.secure_url;
  }

  async deleteImage(fileUrl?: string | null): Promise<void> {
    const configuredCloudinary = this.getConfiguredCloudinary();

    const publicId = this.extractPublicId(fileUrl);
    if (!publicId) {
      return;
    }

    const result = await configuredCloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    if (result.result === 'ok' || result.result === 'not found') {
      return;
    }

    throw new InternalServerErrorException(
      `Failed to delete image from Cloudinary: ${result.result}`,
    );
  }

  private get uploadFolder(): string {
    return process.env.CLOUDINARY_FOLDER ?? 'cms';
  }

  private getConfiguredCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary configuration is missing',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const currentConfig = cloudinary.config();
    if (!currentConfig.api_key || !currentConfig.api_secret) {
      throw new InternalServerErrorException(
        'Cloudinary configuration could not be applied',
      );
    }

    return cloudinary;
  }

  private resolveImageExtension(fileName?: string): string | undefined {
    const extension = extname(fileName ?? '')
      .replace('.', '')
      .trim();
    return extension || undefined;
  }

  private extractPublicId(fileUrl?: string | null): string | null {
    if (!fileUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(fileUrl);
      if (!parsedUrl.hostname.includes('cloudinary.com')) {
        return null;
      }

      const uploadPath = parsedUrl.pathname.split('/upload/')[1];
      if (!uploadPath) {
        return null;
      }

      const segments = uploadPath.split('/').filter(Boolean);
      const versionIndex = segments.findIndex((segment) =>
        /^v\d+$/.test(segment),
      );
      const publicIdSegments =
        versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;

      if (publicIdSegments.length === 0) {
        return null;
      }

      const lastSegmentIndex = publicIdSegments.length - 1;
      publicIdSegments[lastSegmentIndex] = publicIdSegments[
        lastSegmentIndex
      ].replace(/\.[^.]+$/, '');

      return decodeURIComponent(publicIdSegments.join('/'));
    } catch {
      return null;
    }
  }
}
