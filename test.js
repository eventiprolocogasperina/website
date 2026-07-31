const { v2: cloudinary } = require('cloudinary');
try {
  // If we pass undefined, does it throw?
  console.log("No error yet");
} catch(e) {
  console.log(e);
}
