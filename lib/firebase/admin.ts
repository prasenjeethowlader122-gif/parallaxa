import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

var serviceAccount = require ('/chirpstream-dg7rv-firebase-adminsdk-fbsvc-f597864d77.json')
/**const serviceAccount = {
  projectId: 'chirpstream-dg7rv',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@chirpstream-dg7rv.iam.gserviceaccount.com',
  privateKey: ''?.replace(/\\n/g, "\n"),
};**/

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);