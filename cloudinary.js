export const CLOUDINARY_CLOUD_NAME = "xl0azxka";
export const CLOUDINARY_UPLOAD_PRESET = "dj_oskarin_gallery";

export function openCloudinaryUpload(callback) {
  cloudinary.openUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,

      multiple: true,
      sources: [
        "local",
        "camera"
      ],

      folder: "dj-oskarin/gallery",

      resourceType: "image",

      clientAllowedFormats: [
        "jpg",
        "jpeg",
        "png",
        "webp"
      ]
    },

    (error, result) => {
      if (error) {
  console.error("Cloudinary upload error:", error);
  alert(error.message || "Cloudinary upload failed.");
  return;
}

      if (
        result &&
        result.event === "success"
      ) {
        callback(result.info);
      }
    }
  );
}