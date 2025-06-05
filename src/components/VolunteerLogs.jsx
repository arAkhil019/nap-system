import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, startAfter, endBefore, limitToLast, orderBy } from 'firebase/firestore'; // Added orderBy
import '../App.css';

export default function VolunteerLogs() {
  const [nvId, setNvId] = useState('');
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [logsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1); // For display purposes
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);


  const fetchInitialLogs = async (filterNvId = nvId) => {
    setLoading(true);
    setLogs([]);
    setLastVisible(null);
    setFirstVisible(null);
    setCurrentPage(1);
    setIsFetchingInitial(true);

    try {
      let logsQuery = query(collection(db, 'LOGs'), orderBy('Timestamp', 'desc'), limit(logsPerPage)); // Order by Timestamp
      if (filterNvId.trim()) {
        logsQuery = query(collection(db, 'LOGs'), where('NV_ID', '==', filterNvId.trim()), orderBy('Timestamp', 'desc'), limit(logsPerPage));
      }
      
      const snapshot = await getDocs(logsQuery);
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);

      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
      }
    } catch (error) {
      console.error("Error fetching initial logs:", error);
      alert("Error fetching logs: " + error.message);
    } finally {
      setLoading(false);
      setIsFetchingInitial(false);
    }
  };
  
  // Fetch logs on initial mount
  useEffect(() => {
    fetchInitialLogs();
  }, []); // Empty dependency array means this runs once on mount


  const handleFetchUserLogs = () => {
    fetchInitialLogs(nvId); // Pass current nvId to filter
  };

  const fetchNextPage = async () => {
    if (!lastVisible || loading) return;
    setLoading(true);
    try {
      let logsQuery = query(collection(db, 'LOGs'), orderBy('Timestamp', 'desc'), startAfter(lastVisible), limit(logsPerPage));
      if (nvId.trim()) {
        logsQuery = query(collection(db, 'LOGs'), where('NV_ID', '==', nvId.trim()), orderBy('Timestamp', 'desc'), startAfter(lastVisible), limit(logsPerPage));
      }
      const snapshot = await getDocs(logsQuery);
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);

      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setCurrentPage(prev => prev + 1);
      } else {
        setLastVisible(null); // No more next pages
      }
    } catch (error) {
      console.error("Error fetching next page:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrevPage = async () => {
    if (!firstVisible || loading || currentPage <= 1) return;
    setLoading(true);
    try {
      let logsQuery = query(collection(db, 'LOGs'), orderBy('Timestamp', 'desc'), endBefore(firstVisible), limitToLast(logsPerPage));
      if (nvId.trim()) {
        logsQuery = query(collection(db, 'LOGs'), where('NV_ID', '==', nvId.trim()), orderBy('Timestamp', 'desc'), endBefore(firstVisible), limitToLast(logsPerPage));
      }
      const snapshot = await getDocs(logsQuery);
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);

      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setCurrentPage(prev => prev - 1);
      } else {
         // This case should ideally not happen if currentPage > 1 and firstVisible was set
      }
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Assuming timestamp is a Firebase Timestamp object
    return timestamp.toDate().toLocaleString(); 
  };


  return (
    <div className="card"> {/* Replaces p-4 */}
      <h2 className="page-title">View Volunteer Logs</h2> {/* Replaces text-xl font-bold */}
      
      <div className="filter-controls"> {/* Replaces flex items-center mb-4 */}
        <input 
          value={nvId} 
          onChange={(e) => setNvId(e.target.value)} 
          placeholder="Enter NV ID to filter" 
          className="form-input" // Replaces p-2 border
        />
        <button 
          onClick={handleFetchUserLogs} 
          className="btn btn-primary" // Replaces bg-blue-600 text-white p-2 ml-2
          disabled={loading}
        >
          {loading && isFetchingInitial ? 'Fetching...' : 'Fetch Logs'}
        </button>
      </div>

      {loading && !logs.length ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No logs found for the specified criteria.</p>
      ) : (
        <ul className="log-list"> {/* Replaces mt-4 space-y-2 */}
          {logs.map((log) => (
            <li key={log.id} className="log-item"> {/* Replaces border p-2 rounded */}
              <span className="log-id">{log.Log_ID}</span> : 
              <strong className="log-nvid">{log.NV_ID}</strong>, 
              Category: <span className="log-category">{log.Category}</span>, 
              NAPs: <span className="log-naps">{log.NAPs}</span> - 
              <span className="log-description">{log.Description}</span>
              <span className="log-timestamp"> ({formatDate(log.Timestamp)})</span>
            </li>
          ))}
        </ul>
      )}
      
      <div className="pagination-controls"> {/* Replaces flex justify-between mt-4 */}
        <button onClick={fetchPrevPage} disabled={loading || currentPage <= 1} className="btn btn-secondary">
          Previous
        </button>
        <span className="page-indicator">Page {currentPage}</span>
        <button onClick={fetchNextPage} disabled={loading || !lastVisible || logs.length < logsPerPage} className="btn btn-secondary">
          Next
        </button>
      </div>
    </div>
  );
}