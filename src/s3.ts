import { S3 } from 'aws-sdk';

class S3Kit {
  private readonly instance: S3;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(bucketName?: string, objectPrefix?: string) {
    this.instance = new S3({
      apiVersion: '2006-03-01'
    });

    this.bucket = bucketName || process.env.S3_BUCKET;
    this.prefix = objectPrefix || process.env.S3_OBJECT_PREFIX || '';
  }

  async getObject(messageId: string): Promise<string> {
    const req = await this.instance
      .getObject({
        Bucket: this.bucket,
        Key: `${this.prefix}/${messageId}`
      })
      .promise();

    return req.Body.toString();
  }
}

export default S3Kit;
