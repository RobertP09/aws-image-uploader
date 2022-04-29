import express from 'express';
import { 
  IUploaderOptions,
  ImageUploader,
  IRegion
  } from './util/s3-upload';

const PORT = 4000;

const uploaderConfig: IUploaderOptions = {
  bucketName: 'rp-image-uploader',
  credentials: {
    accessKeyId: "",
    secretAccessKey: ""
  },
  region: IRegion.UsWest1
};

const uploader = new ImageUploader(uploaderConfig);

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/make', async (req, res) => {
  try {
    const made = await uploader.makeBucket();
    if(!made) {
      res.status(400).json(made)
    }
    res.status(200).json({success: made});
  } catch (error) {
    console.log(error)
    console.log('problem making bucket')
  }
})

app.post<string, {}, {}, {imageName: string, image: {mime: string, data: string}}, {}, {}>('/upload', async (req, res) => {
  const imageName = req.body.imageName;
  const data = Buffer.from(req.body.image.data, 'base64');
  try {
    const uploaded = await uploader.imageUpload({imageName, data});
    if(!uploaded) {
      res.status(400).json({msg: "Error uploading"})
    }
    res.status(200).json({msg: "Uploaded", path: uploaded })
  } catch (error) {
    console.log(error)
  }
})


app.listen(PORT, () => {
  console.log('Listening on port 4000');
})