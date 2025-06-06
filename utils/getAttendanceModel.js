// utils/getAttendanceModel.js
const mongoose = require("mongoose");
const attendanceSchema = require("../models/attendance.model").schema;
const modelCache = {};
function getAttendanceModel(collectionName) {
  if (!modelCache[collectionName]) {
    modelCache[collectionName] = mongoose.model(
      collectionName,
      attendanceSchema,
      collectionName // this sets the actual MongoDB collection name
    );
  }
  return modelCache[collectionName];
}

module.exports = getAttendanceModel;
