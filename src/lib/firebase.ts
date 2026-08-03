import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the databaseId from config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export default app;
