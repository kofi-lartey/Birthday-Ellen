// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyD7y5ouo_sq1UpVfGZ8c95o1XkNWcMopoM",
    authDomain: "ellen-birthday.firebaseapp.com",
    projectId: "ellen-birthday",
    storageBucket: "ellen-birthday.firebasestorage.app",
    messagingSenderId: "423290705776",
    appId: "1:423290705776:web:7c39e130d2334b7c2a61b5",
    measurementId: "G-P9F3PQWBNP"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const storageRef = storage.ref();

// Upload image to Firebase Storage
async function uploadToFirebase(file) {
    return new Promise((resolve, reject) => {
        // Create a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `birthday_${timestamp}_${randomStr}.${file.name.split('.').pop()}`;

        const imageRef = storageRef.child('images/' + fileName);

        imageRef.put(file).then((snapshot) => {
            return snapshot.ref.getDownloadURL();
        }).then((downloadURL) => {
            resolve(downloadURL);
        }).catch((error) => {
            reject(error);
        });
    });
}

// Get all images from Firebase Storage
async function getAllImages() {
    try {
        const imagesRef = storageRef.child('images');
        const result = await imagesRef.listAll();

        const imageUrls = [];
        for (const item of result.items) {
            const url = await item.getDownloadURL();
            imageUrls.push(url);
        }
        return imageUrls;
    } catch (error) {
        console.error('Error getting images:', error);
        return [];
    }
}

// Delete image from Firebase Storage
async function deleteFromFirebase(imageUrl) {
    try {
        // Get the reference from the URL
        const imageRef = storage.refFromURL(imageUrl);
        await imageRef.delete();
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}
