import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
export function watchLatest(name, id, onData, onError) {
  return onSnapshot(query(collection(db, name), where('boiler_id', '==', id), orderBy('timestamp', 'desc'), limit(1)),
    (snapshot) => onData(snapshot.empty ? null : snapshot.docs[0].data()), onError);
}
