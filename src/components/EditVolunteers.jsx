import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import '../App.css'; // Assuming shared styles

// Define a debounce function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

export default function EditVolunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  
  const initialFormData = {
    NV_ID: '', Roll_No: '', Name: '', firstName: '', lastName: '', Mail: '', Number: '',
    Branch: '', UNIT: '', address: '', barcode: '', bloodGroup: '', // barcode field
    Club_Designation: '', IMG_LINK: '', Paid: '', Role: '', S_No: '', section: '', time: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchVolunteers = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      // Check cache
      const cachedData = sessionStorage.getItem('volunteersData');
      const cachedTime = sessionStorage.getItem('volunteersDataTime');

      if (!forceRefresh && cachedData && cachedTime) {
         const data = JSON.parse(cachedData);
         setVolunteers(data);
         setFilteredVolunteers(data);
         setLastUpdated(new Date(parseInt(cachedTime)));
         setLoading(false);
         return;
      }

      const volunteersSnapshot = await getDocs(collection(db, 'Volunteers'));
      const volunteersList = volunteersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      volunteersList.sort((a, b) => (String(a.NV_ID) || "").localeCompare(String(b.NV_ID) || ""));
      setVolunteers(volunteersList);
      setFilteredVolunteers(volunteersList);
      
      // Update cache
      const now = Date.now();
      setLastUpdated(new Date(now));
      sessionStorage.setItem('volunteersData', JSON.stringify(volunteersList));
      sessionStorage.setItem('volunteersDataTime', now.toString());

    } catch (err) {
      console.error("Error fetching volunteers:", err);
      setError('Failed to load volunteers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const debouncedSearch = useCallback(
    debounce((term) => {
      setCurrentPage(1);
      if (!term.trim()) {
        setFilteredVolunteers(volunteers);
        return;
      }
      const lowercasedTerm = term.toLowerCase();
      const filtered = volunteers.filter(v =>
        (String(v.NV_ID || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.Roll_No || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.Name || '').toLowerCase().includes(lowercasedTerm)) || // Search by Name field
        (String(v.firstName || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.lastName || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.Branch || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.UNIT || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.email || '').toLowerCase().includes(lowercasedTerm)) ||
        (String(v.phone || '').toLowerCase().includes(lowercasedTerm))
      );
      setFilteredVolunteers(filtered);
    }, 300),
    [volunteers]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);


  const handleEdit = (volunteer) => {
    setEditingVolunteer(volunteer);
    const populatedFormData = { ...initialFormData };

    populatedFormData.NV_ID = volunteer.NV_ID || '';
    populatedFormData.Roll_No = volunteer.Roll_No || volunteer['Roll Num'] || '';
    populatedFormData.Name = volunteer.Name || '';
    populatedFormData.firstName = volunteer.firstName || '';
    populatedFormData.lastName = volunteer.lastName || '';
    populatedFormData.Mail = volunteer.Mail || volunteer.email || '';
    populatedFormData.Number = volunteer.Number || volunteer.phone || '';
    populatedFormData.Branch = volunteer.Branch || '';
    populatedFormData.UNIT = volunteer.UNIT || volunteer.Unit || '';
    populatedFormData.address = volunteer.address || '';
    populatedFormData.bloodGroup = volunteer.bloodGroup || '';
    populatedFormData.Club_Designation = volunteer.Club_Designation || volunteer.Designation || '';
    populatedFormData.IMG_LINK = volunteer.IMG_LINK || '';
    populatedFormData.Paid = volunteer.Paid || volunteer.paid || '';
    populatedFormData.Role = volunteer.Role || '';
    populatedFormData.S_No = volunteer.S_No || volunteer.sNo || volunteer.SNo || '';
    populatedFormData.section = volunteer.section || '';
    populatedFormData.time = volunteer.time || '';
    
    const nvIdForBarcode = String(populatedFormData.NV_ID).trim();
    populatedFormData.barcode = nvIdForBarcode ? `*${nvIdForBarcode}*` : ''; 

    setFormData(populatedFormData);
  };

  const handleCancelEdit = () => {
    setEditingVolunteer(null);
    setFormData(initialFormData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Prevent direct changes to barcode if NV_ID is the source,
    // but NV_ID is already readonly, so this is mostly for completeness.
    // Barcode is set in handleEdit.
    if (name === 'barcode') return; 

    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingVolunteer) return;
    setLoading(true);

    if (!String(formData.NV_ID || '').trim() || !String(formData.Roll_No || '').trim()) {
        alert("NV_ID and Roll Number cannot be empty.");
        setLoading(false);
        return;
    }

    try {
        const currentRollNo = String(formData.Roll_No || '').trim();
        const originalRollNo = String(editingVolunteer.Roll_No || '').trim();

        if (currentRollNo !== originalRollNo) {
            const rollNoQuery = query(collection(db, "Volunteers"), where("Roll_No", "==", currentRollNo));
            const rollNoSnapshot = await getDocs(rollNoQuery);
            if (!rollNoSnapshot.empty && rollNoSnapshot.docs.some(doc => doc.id !== editingVolunteer.id)) {
                alert(`Error: Roll Number ${currentRollNo} already exists for another volunteer.`);
                setLoading(false);
                return;
            }
        }
        
        const volunteerRef = doc(db, 'Volunteers', editingVolunteer.id);
        
        // Ensure barcode is correctly formatted based on the current NV_ID in formData
        // (though NV_ID is readonly, this ensures consistency if it were ever changed programmatically)
        const nvIdForBarcodeSave = String(formData.NV_ID || '').trim();
        const dataToSave = { 
            ...formData,
            barcode: nvIdForBarcodeSave ? `*${nvIdForBarcodeSave}*` : '' 
        };
        
        if (dataToSave.S_No && !isNaN(parseFloat(dataToSave.S_No))) {
            dataToSave.S_No = parseFloat(dataToSave.S_No);
        }
        if (typeof dataToSave.Paid === 'string') {
            dataToSave.Paid = dataToSave.Paid.toLowerCase() === 'true' || dataToSave.Paid.toLowerCase() === 'yes';
        }

        await updateDoc(volunteerRef, dataToSave);

        const napDocRef = doc(db, "NAPs", formData.NV_ID);
        const napDocSnap = await getDoc(napDocRef);

        if (napDocSnap.exists()) {
            const napUpdateData = {};
            if (currentRollNo !== originalRollNo) {
                napUpdateData.Roll_No = currentRollNo;
            }
            const currentUnit = String(formData.UNIT || '').trim();
            const originalUnit = String(editingVolunteer.UNIT || '').trim();
            if (currentUnit !== originalUnit) {
                napUpdateData.Unit = currentUnit;
            }
            if (Object.keys(napUpdateData).length > 0) {
                await updateDoc(napDocRef, napUpdateData);
            }
        }

        alert('Volunteer updated successfully!');
        setEditingVolunteer(null);
        setFormData(initialFormData);
        fetchVolunteers(); 
    } catch (err) {
        console.error("Error updating volunteer:", err);
        alert(`Error updating volunteer: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (volunteerId, nvId) => {
    // ... (existing handleDelete logic - ensure it uses String(nvId) if nvId can be number)
    if (!window.confirm(`Are you sure you want to delete volunteer ${String(nvId)}? This will also delete their associated NAPs and vLOGs entries. This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const safeNvId = String(nvId); // Ensure nvId is a string for queries

      batch.delete(doc(db, 'Volunteers', volunteerId));

      // NAPs and vLOGs are assumed to use NV_ID as document ID
      batch.delete(doc(db, "NAPs", safeNvId));
      batch.delete(doc(db, "vLOGs", safeNvId));
      
      await batch.commit();
      alert('Volunteer and associated data deleted successfully!');
      fetchVolunteers(); 
    } catch (err) {
      console.error("Error deleting volunteer:", err);
      alert(`Error deleting volunteer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVolunteers = filteredVolunteers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVolunteers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading && volunteers.length === 0) return <div className="loading-container"><p>Loading Volunteers...</p></div>;
  if (error) return <div className="message message-error">{error}</div>;

  return (
    <div className="card edit-volunteers-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>Manage Volunteers</h2>
        <button
            onClick={() => fetchVolunteers(true)}
            className="btn"
            style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 16px' }}
            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Refresh data'}
          >
            Refresh ⟳
        </button>
      </div>
      <div className="form-group">
        <input
          type="text"
          className="form-input"
          placeholder="Search by ID, Roll, Name, Branch, Unit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {editingVolunteer ? (
        <div className="edit-form-modal">
          <form onSubmit={handleSave} className="card">
            <h3 className="section-title">Edit Volunteer: {String(editingVolunteer.NV_ID)}</h3>
            <div className="form-grid two-columns">
                <div className="form-group">
                    <label htmlFor="NV_ID" className="form-label">NV ID</label>
                    <input type="text" name="NV_ID" id="NV_ID" value={formData.NV_ID} className="form-input" readOnly disabled />
                </div>
                <div className="form-group">
                    <label htmlFor="barcode" className="form-label">Barcode (from NV ID)</label>
                    <input 
                        type="text" 
                        name="barcode" 
                        id="barcode" 
                        value={formData.barcode} 
                        className="form-input barcode-text" // Apply barcode font class
                        readOnly // Make it read-only
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="Name" className="form-label">Full Name (Display)</label>
                    <input type="text" name="Name" id="Name" value={formData.Name} onChange={handleChange} className="form-input" />
                </div>
                 <div className="form-group">
                    <label htmlFor="Roll_No" className="form-label">Roll Number*</label>
                    <input type="text" name="Roll_No" id="Roll_No" value={formData.Roll_No} onChange={handleChange} className="form-input" required />
                </div>
                <div className="form-group">
                    <label htmlFor="sNo" className="form-label">SNo</label>
                    <input type="number" name="sNo" id="sNo" value={formData.S_No} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="Mail" className="form-label">Email (Mail)</label>
                    <input type="email" name="Mail" id="Mail" value={formData.Mail} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="Number" className="form-label">Phone (Number)</label>
                    <input type="tel" name="Number" id="Number" value={formData.Number} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="Branch" className="form-label">Department (Branch)</label>
                    <input type="text" name="Branch" id="Branch" value={formData.Branch} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="UNIT" className="form-label">Sub-Group (Unit)</label>
                    <input type="text" name="UNIT" id="UNIT" value={formData.UNIT} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="section" className="form-label">Section</label>
                    <input type="text" name="section" id="section" value={formData.section} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="Role" className="form-label">Role</label>
                    <input type="text" name="Role" id="Role" value={formData.Role} onChange={handleChange} className="form-input" />
                </div>
                 <div className="form-group">
                    <label htmlFor="Club_Designation" className="form-label">Designation</label>
                    <input type="text" name="Club_Designation" id="Club_Designation" value={formData.Club_Designation} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="address" className="form-label">Address</label>
                    <textarea name="address" id="address" value={formData.address} onChange={handleChange} className="form-textarea" rows="2"></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="bloodGroup" className="form-label">Blood Group</label>
                    <input type="text" name="bloodGroup" id="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="imgLink" className="form-label">Image Link</label>
                    <input type="url" name="imgLink" id="imgLink" value={formData.IMG_LINK} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="paid" className="form-label">Paid</label>
                     <select name="paid" id="paid" value={formData.Paid} onChange={handleChange} className="form-select">
                        <option value="">Select Status</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="time" className="form-label">Time (Custom Field)</label>
                    <input type="text" name="time" id="time" value={formData.time} onChange={handleChange} className="form-input" placeholder="e.g., Event Time or Notes"/>
                </div>
                <div className="form-group">
                    <label htmlFor="firstName" className="form-label">First Name (Component of Name)</label>
                    <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="lastName" className="form-label">Last Name (Component of Name)</label>
                    <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="form-input" />
                </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>NV ID</th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentVolunteers.length > 0 ? currentVolunteers.map(v => (
                  <tr key={v.id}>
                    <td>{String(v.NV_ID || '')}</td>
                    <td>{String(v.Roll_No || '')}</td>
                    <td>{v.Name || `${String(v.firstName || '')} ${String(v.lastName || '')}`.trim()}</td>
                    <td>{String(v.Mail || v.email || '')}</td>
                    <td>{String(v.Number || v.phone || '')}</td>
                    <td>{String(v.Branch || '')}</td>
                    <td>{String(v.UNIT || v.Unit || '')}</td>
                    <td>
                      <button onClick={() => handleEdit(v)} className="btn btn-primary btn-small" disabled={loading}>Edit</button>
                      <button onClick={() => handleDelete(v.id, v.NV_ID)} className="btn btn-danger btn-small" disabled={loading}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="text-center">No volunteers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || loading} className="btn btn-secondary">Prev</button>
              <span className="page-indicator">Page {currentPage} of {totalPages}</span>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || loading} className="btn btn-secondary">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}