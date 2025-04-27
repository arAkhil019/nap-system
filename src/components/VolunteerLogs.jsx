import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function VolunteerLogs() {
  const [nvId, setNvId] = useState('');
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const logsRef = collection(db, 'LOGs');
      const q = query(logsRef, where('NV_ID', '==', nvId));
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      console.log("Fetch successful:", snapshot.docs.length, "logs found");
    } catch (error) {
      console.error("Error fetching logs:", error);
      alert("Error fetching logs: " + error.message);
      setLogs([]);
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
            <strong>{log.Category}</strong>: {log.NAPs} NAPs - {log.Description}
          </li>
        ))}
      </ul>
    </div>
  );
}