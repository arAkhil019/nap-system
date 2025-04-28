import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, startAfter, endBefore, limitToLast } from 'firebase/firestore';

export default function VolunteerLogs() {
  const [nvId, setNvId] = useState('');
  const [logs, setLogs] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10); // Show 10 logs per page
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Fetch logs when component mounts
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
    
      setLoading(true);
      let logsRef = collection(db, 'LOGs');
      let q;
      
      if (nvId.trim()) {
        // If NV ID is provided, filter by it
        q = query(logsRef, where('NV_ID', '==', nvId), limit(logsPerPage));
      } else {
        // Otherwise fetch all logs with pagination
        q = query(logsRef, limit(logsPerPage));
      }
      
      const snapshot = await getDocs(q);
      
      // Update page markers
      // console.log("Fetched logs with NV_ID:", snapshot.docs.map(doc => doc.data().NV_ID));
      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setHasMore(snapshot.docs.length === logsPerPage);
      } else {
        setHasMore(false);
      }
      
      setHasPrevious(false); // Reset previous page flag
      setCurrentPage(1); // Reset to first page
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      console.log("Fetch successful:", snapshot.docs.length, "logs found");
    } catch (error) {
      console.error("Error fetching logs:", error);
      alert("Error fetching logs: " + error.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const nextPage = async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      let logsRef = collection(db, 'LOGs');
      let q;
      
      if (nvId.trim()) {
        q = query(
          logsRef, 
          where('NV_ID', '==', nvId),
          startAfter(lastVisible),
          limit(logsPerPage)
        );
      } else {
        q = query(
          logsRef,
          startAfter(lastVisible),
          limit(logsPerPage)
        );
      }
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setHasMore(snapshot.docs.length === logsPerPage);
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCurrentPage(prev => prev + 1);
        setHasPrevious(true);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching next page:", error);
    } finally {
      setLoading(false);
    }
  };

  const prevPage = async () => {
    if (loading || !hasPrevious) return;
    
    try {
      setLoading(true);
      let logsRef = collection(db, 'LOGs');
      let q;
      
      if (nvId.trim()) {
        q = query(
          logsRef,
          where('NV_ID', '==', nvId),
          endBefore(firstVisible),
          limitToLast(logsPerPage)
        );
      } else {
        q = query(
          logsRef,
          endBefore(firstVisible),
          limitToLast(logsPerPage)
        );
      }
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCurrentPage(prev => prev - 1);
        setHasPrevious(currentPage > 2);
        setHasMore(true);
      }
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">View Logs</h2>
      <input value={nvId} onChange={(e) => setNvId(e.target.value)} placeholder="Enter NV ID" className="p-2 border" />
      <button onClick={fetchLogs} className="bg-blue-600 text-white p-2 ml-2">Fetch Logs</button>
      <ul className="mt-4 space-y-2">
        {logs.map((log, i) => (
          <li key={i} className="border p-2 rounded">
            {log.Log_ID} : <strong>{log.NV_ID},</strong> {log.Category}: {log.NAPs} NAPs - {log.Description}
          </li>
        ))}
      </ul>
    </div>
  );
}