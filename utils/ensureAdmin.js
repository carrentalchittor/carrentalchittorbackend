const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = async function ensureAdmin() {
  const name = String(
    process.env.ADMIN_NAME || "Admin"
  ).trim();

  const phone = String(
    process.env.ADMIN_PHONE || ""
  ).trim();

  const email = String(
    process.env.ADMIN_EMAIL || ""
  )
    .trim()
    .toLowerCase();

  const city = String(
    process.env.ADMIN_CITY || "Chittorgarh"
  ).trim();

  const adminPassword = String(
    process.env.ADMIN_PASSWORD || ""
  );

  if (
    !name ||
    !phone ||
    !email ||
    !city ||
    !adminPassword
  ) {
    throw new Error(
      "ADMIN_NAME, ADMIN_PHONE, ADMIN_EMAIL, ADMIN_CITY and ADMIN_PASSWORD are required in .env"
    );
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(
      "ADMIN_PHONE must be a valid 10 digit Indian phone number"
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "ADMIN_EMAIL must be a valid email address"
    );
  }

  if (adminPassword.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 8 characters"
    );
  }

  const existingAdmin = await User.findOne({
    $or: [
      { phone },
      { email },
      { role: "admin" },
    ],
  }).select("+password");

  if (existingAdmin) {
    let changed = false;

    if (existingAdmin.name !== name) {
      existingAdmin.name = name;
      changed = true;
    }

    if (existingAdmin.phone !== phone) {
      existingAdmin.phone = phone;
      changed = true;
    }

    if (existingAdmin.email !== email) {
      existingAdmin.email = email;
      changed = true;
    }

    if (existingAdmin.city !== city) {
      existingAdmin.city = city;
      changed = true;
    }

    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      changed = true;
    }

    if (changed) {
      await existingAdmin.save();

      console.log(
        "Default admin information updated"
      );
    } else {
      console.log("Admin already exists");
    }

    return;
  }

  const hashedPassword = await bcrypt.hash(
    adminPassword,
    12
  );

  await User.create({
    name,
    phone,
    email,
    city,
    password: hashedPassword,
    role: "admin",
  });

  console.log("Default admin created");
  console.log(`Admin email: ${email}`);
};