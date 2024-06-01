/*

multer is basically a package which is used to upload images from our device. To make it faster, we will store the image here only. It is a middlware.

*/

import multer from 'multer';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, "uploads")
    },
    filename(req, file, callback) {
        /*
        
            Here the file name we are giving is the orignal name only, but if we upload the same image again, then it will get uploaded, but when we want to delete any one image, both will get deleted as the name of the images will be same.

            So we have to give any unique identifier to the image name, for that we will use another package i.e uuid.
        
        */

        const id = uuid();

        // ["uploads\macbook-air-midnight-gallery1-20220606", "jpg"]
        const extension_name = file.originalname.split(".").pop(); 

        const filename = `${id}.${extension_name}`

        callback(null, filename)
    }
}); 

export const sinlgeUpload = multer({
    storage
}).single("photo");

// multer().single("file") -> This is a middlware, we can use it in app.ts Now we can access it using req.file.photo
