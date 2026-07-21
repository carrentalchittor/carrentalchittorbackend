const router =
  require("express").Router();

const Car = require("../models/Car");
const auth =
  require("../middleware/auth");
const admin =
  require("../middleware/admin");
const upload =
  require("../middleware/upload");

const {
  uploadBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

let carsCache = null;
let carsCacheTime = 0;

const CARS_CACHE_DURATION =
  10 * 60 * 1000; // 10 minutes

function clearCarsCache() {
  carsCache = null;
  carsCacheTime = 0;
}

// Get all available vehicles
router.get("/", async (req, res, next) => {
  try {
    const now = Date.now();

    // Browser/CDN caching
    res.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600"
    );

    // Backend memory cache
    if (
      carsCache &&
      now - carsCacheTime <
        CARS_CACHE_DURATION
    ) {
      return res.json(carsCache);
    }

    const cars = await Car.find({
      available: true,
    })
      .select(
        [
          "name",
          "brand",
          "vehicleType",
          "type",
          "seats",
          "pricePerDay",
          "fuel",
          "transmission",
          "description",
          "image",
          "available",
          "createdAt",
        ].join(" ")
      )
      .sort({ createdAt: -1 })
      .lean();

    carsCache = cars;
    carsCacheTime = now;

    return res.json(cars);
  } catch (error) {
    next(error);
  }
});

// Create vehicle
router.post(
  "/",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    let uploadedImage = null;

    try {
      const name = String(
        req.body.name || ""
      ).trim();

      const pricePerDay = Number(
        req.body.pricePerDay
      );

      const seats = Number(
        req.body.seats || 5
      );

      const vehicleType =
        req.body.vehicleType || "car";

      const allowedVehicleTypes = [
        "car",
        "bike",
        "scooty",
      ];

      if (!name) {
        return res.status(400).json({
          message:
            "Vehicle name is required",
        });
      }

      if (
        !Number.isFinite(pricePerDay) ||
        pricePerDay < 0
      ) {
        return res.status(400).json({
          message:
            "Valid vehicle price is required",
        });
      }

      if (
        !Number.isFinite(seats) ||
        seats < 1 ||
        seats > 20
      ) {
        return res.status(400).json({
          message:
            "Seats must be between 1 and 20",
        });
      }

      if (
        !allowedVehicleTypes.includes(
          vehicleType
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid vehicle type",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            "Vehicle image is required",
        });
      }

      uploadedImage = await uploadBuffer(
        req.file.buffer,
        "carrental-chittorgarh/vehicles"
      );

      const car = await Car.create({
        name,

        brand: String(
          req.body.brand || ""
        ).trim(),

        vehicleType,

        type: String(
          req.body.type || ""
        ).trim(),

        seats,
        pricePerDay,

        fuel: String(
          req.body.fuel || ""
        ).trim(),

        transmission: String(
          req.body.transmission || ""
        ).trim(),

        description: String(
          req.body.description || ""
        ).trim(),

        image: uploadedImage.secure_url,

        imagePublicId:
          uploadedImage.public_id,

        available: true,
      });

      clearCarsCache();

      return res
        .status(201)
        .json(car);
    } catch (error) {
      // DB save fail होने पर नई uploaded image delete
      if (uploadedImage?.public_id) {
        try {
          await deleteCloudinaryImage(
            uploadedImage.public_id
          );
        } catch (deleteError) {
          console.error(
            "New image cleanup error:",
            deleteError
          );
        }
      }

      next(error);
    }
  }
);

// Update vehicle
router.put(
  "/:id",
  auth,
  admin,
  upload.single("image"),
  async (req, res, next) => {
    let newUploadedImage = null;

    try {
      const car = await Car.findById(
        req.params.id
      ).select("+imagePublicId");

      if (!car) {
        return res.status(404).json({
          message:
            "Vehicle not found",
        });
      }

      const oldPublicId =
        car.imagePublicId;

      if (req.file) {
        newUploadedImage =
          await uploadBuffer(
            req.file.buffer,
            "carrental-chittorgarh/vehicles"
          );

        car.image =
          newUploadedImage.secure_url;

        car.imagePublicId =
          newUploadedImage.public_id;
      }

      const stringFields = [
        "name",
        "brand",
        "type",
        "fuel",
        "transmission",
        "description",
      ];

      stringFields.forEach((field) => {
        if (
          req.body[field] !== undefined
        ) {
          car[field] = String(
            req.body[field]
          ).trim();
        }
      });

      if (
        req.body.vehicleType !== undefined
      ) {
        const allowedVehicleTypes = [
          "car",
          "bike",
          "scooty",
        ];

        if (
          !allowedVehicleTypes.includes(
            req.body.vehicleType
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid vehicle type",
          });
        }

        car.vehicleType =
          req.body.vehicleType;
      }

      if (
        req.body.seats !== undefined
      ) {
        const seats = Number(
          req.body.seats
        );

        if (
          !Number.isFinite(seats) ||
          seats < 1 ||
          seats > 20
        ) {
          return res.status(400).json({
            message:
              "Seats must be between 1 and 20",
          });
        }

        car.seats = seats;
      }

      if (
        req.body.pricePerDay !== undefined
      ) {
        const pricePerDay = Number(
          req.body.pricePerDay
        );

        if (
          !Number.isFinite(
            pricePerDay
          ) ||
          pricePerDay < 0
        ) {
          return res.status(400).json({
            message:
              "Valid vehicle price is required",
          });
        }

        car.pricePerDay =
          pricePerDay;
      }

      if (
        req.body.available !== undefined
      ) {
        car.available =
          req.body.available === true ||
          req.body.available === "true";
      }

      await car.save();

      // नई image DB में save होने के बाद पुरानी delete
      if (
        newUploadedImage &&
        oldPublicId
      ) {
        try {
          await deleteCloudinaryImage(
            oldPublicId
          );
        } catch (deleteError) {
          console.error(
            "Old image deletion error:",
            deleteError
          );
        }
      }

      clearCarsCache();

      return res.json(car);
    } catch (error) {
      // Update fail होने पर नई image cleanup
      if (
        newUploadedImage?.public_id
      ) {
        try {
          await deleteCloudinaryImage(
            newUploadedImage.public_id
          );
        } catch (deleteError) {
          console.error(
            "Uploaded image cleanup error:",
            deleteError
          );
        }
      }

      next(error);
    }
  }
);

// Delete vehicle
router.delete(
  "/:id",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const car = await Car.findById(
        req.params.id
      ).select("+imagePublicId");

      if (!car) {
        return res.status(404).json({
          message:
            "Vehicle not found",
        });
      }

      const imagePublicId =
        car.imagePublicId;

      // पहले database record delete होगा
      await car.deleteOne();

      clearCarsCache();

      // उसके बाद Cloudinary image delete होगी
      if (imagePublicId) {
        try {
          await deleteCloudinaryImage(
            imagePublicId
          );
        } catch (deleteError) {
          console.error(
            "Cloudinary deletion error:",
            deleteError
          );
        }
      }

      return res.json({
        message:
          "Vehicle deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;