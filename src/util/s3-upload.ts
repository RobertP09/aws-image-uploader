import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  PutBucketPolicyCommand
} from '@aws-sdk/client-s3';

// Add remaining regions?
export enum IRegion {
  UsEast1 = 'us-east-1',
  UsEast2 = 'us-east-2',
  UsWest1 = 'us-west-1',
  UsWest2 = 'us-west-1'
}

export interface IUploaderOptions {
  bucketName: string;
  region: IRegion;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class ImageUploader {
  bucketName: string;
  client: S3Client;
  location: string = '';

  constructor(options: IUploaderOptions) {
    // Set our bucketname
    this.bucketName = options.bucketName;
    // forcePathStyle generates url-type location
    this.location = `http://${options.bucketName}.s3.amazonaws.com/`;

    const client = new S3Client({
      region: options.region,
      forcePathStyle: true,
      credentials: options.credentials
        ? options.credentials
        : {
            accessKeyId: process.env.ACCESS_KEY_ID as string,
            secretAccessKey: process.env.SECRET_ACCESS_KEY as string
          },
      maxAttempts: 3
    });

    if (!client) {
      console.log('Problem creating uploader client');
      // throw new ClientCreationError();
    }
    this.client = client;
    console.log('Uploader client started');
  }

  async makeBucket(renamedRetry?: boolean) {
    try {
      const { Location } = await this.client.send(
        new CreateBucketCommand({
          // The name we want to give the bucket, has to be unique to AWS users
          Bucket: this.bucketName
        })
      );
      // Possible refactor needed
      if (!Location && renamedRetry === true) {
        const env = process.env.NODE_ENV ?? 'dev';
        const newBucketName = `${this.bucketName}-${env}`;
        await this.client.send(
          new CreateBucketCommand({
            Bucket: newBucketName
          })
        );
        this.bucketName = newBucketName;
        this.location = `http://${newBucketName}.s3.amazonaws.com/`;
        return true;
      } else if (!Location) {
        return false;
      }
    } catch (error) {
      console.error(error);
      // throw new ErrorGeneratingBucket();
    }
    return true;
  }

  // Images are automatically available to be used publically
  async imageUpload({ imageName, data, makePrivate }: { imageName: string; data: Buffer; makePrivate?: boolean }) {
    const keyFileName = `${imageName}-${Date.now()}.png`;
    const imageAccess = makePrivate ? 'private' : 'public-read';
    const imageInfo: PutObjectCommandInput = {
      ACL: imageAccess,
      Bucket: this.bucketName,
      Key: keyFileName,
      Body: data
    };

    try {
      await this.client.send(new PutObjectCommand(imageInfo));
      return this.location + keyFileName;
    } catch (error) {
      console.error(error);
    }
  }

  // Unsure if needed, may see if we can set a previous object to publicly accessable
  // async setImagesPublic () {}
}

/* TODO's
1. Finish CRUDS
2. Refactor bucket name logic - possibly add CLI portion?
3. Change image public ACL to boolean for imageUpload
4. Remove server portion
*/
