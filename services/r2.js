const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require('fs');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});
const r2BucketName = process.env.R2_BUCKET_NAME;
const MULTIPART_THRESHOLD = 1024 * 1024 * 5; // 5MB

async function upload(file, onProgress) {
    const readStream = fs.createReadStream(file.path);

    if (file.size < MULTIPART_THRESHOLD) {
        console.log(`Uploading small file (${file.originalname}) with PutObjectCommand.`);
        await r2Client.send(new PutObjectCommand({
            Bucket: r2BucketName, Key: file.originalname, Body: readStream, ContentType: file.mimetype
        }));
        if (onProgress) onProgress(100);
    } else {
        console.log(`Uploading large file (${file.originalname}) with multipart Upload.`);
        const uploader = new Upload({
            client: r2Client,
            params: {
                Bucket: r2BucketName, Key: file.originalname, Body: readStream, ContentType: file.mimetype
            },
        });
        uploader.on("httpUploadProgress", (progress) => {
            if (progress.total && onProgress) {
                onProgress(Math.round((progress.loaded / progress.total) * 100));
            }
        });
        await uploader.done();
    }
}

async function listFiles() {
    const command = new ListObjectsV2Command({ Bucket: r2BucketName });
    const data = await r2Client.send(command);
    if (!data.Contents) return [];
    return data.Contents.map(obj => ({
        name: obj.Key,
        cloud: 'R2',
        size: obj.Size,
        uploadDate: new Date(obj.LastModified).getTime()
    }));
}

async function download(fileName) {
    const data = await r2Client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: fileName }));
    return data.Body;
}

async function deleteFile(fileName) {
    return r2Client.send(new DeleteObjectCommand({ Bucket: r2BucketName, Key: fileName }));
}

module.exports = { listFiles, upload, download, delete: deleteFile };