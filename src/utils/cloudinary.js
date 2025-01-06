import { v2 as cloudinary } from 'cloudinary';
import cluster from 'cluster';
import { response } from 'express';
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

//configure cloudinary

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET// Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type: "auto" //auto set the file extension
            }
        )
        console.log(`file uploaded on cloudinary `, response.url);
        //once a file is uploaded delete it from storage
        fs.unlinkSync(localFilePath)
        return response
        
    } catch (error) {
        console.log("error on cloudinary",error);
        
        fs.unlinkSync(localFilePath)
        return null
    }
}


const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        console.log("cloudinary from cloudinary");
        
    } catch (error) {
        console.log("error deleting from cloudinary");
        
    }
}
export {uploadOnCloudinary, deleteFromCloudinary}