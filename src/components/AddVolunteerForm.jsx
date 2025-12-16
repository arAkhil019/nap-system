import React, { useState } from 'react';
import { db } from '../firebase'; // Adjust path as needed
import { collection, addDoc, query, where, getDoc,getDocs, doc, setDoc } from 'firebase/firestore';
import '../App.css'; // Ensure this path is correct

export default function AddVolunteerForm() {
  const [formData, setFormData] = useState({
    NV_ID: '',
    Roll_No: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    Branch: '', // Department
    UNIT: '',   // Sub-Group
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const ensureNapsAndVLogsExist = async (nvId, rollNo, unit) => {
    // Ensure NAPs entry
    const napDocRef = doc(db, "NAPs", nvId);
    const napDocSnap = await getDoc(napDocRef);

    if (!napDocSnap.exists()) {
      const napData = { NV_ID: nvId, Roll_No: rollNo || "", Unit: unit || "", TotalNAPs: 0 };
      for (let i = 1; i <= 19; i++) napData[i.toString()] = 0; 
      await setDoc(napDocRef, napData);
    }

    // Ensure vLOGs entry
    const vLogDocRef = doc(db, "vLOGs", nvId);
    const vLogDocSnap = await getDoc(vLogDocRef);

    if (!vLogDocSnap.exists()) {
      await setDoc(vLogDocRef, { NV_ID: nvId, logs: [] });
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Basic validation (you might want more comprehensive validation)
    if (!formData.NV_ID || !formData.Roll_No || !formData.firstName || !formData.lastName) {
      setMessage('Error: Please fill in all required fields (NV_ID, Roll No, First Name, Last Name).');
      setLoading(false);
      return;
    }

    try {
      const nvId = formData.NV_ID.trim();
      const volunteerDocRef = doc(db, "Volunteers", nvId);
      const volunteerDocSnap = await getDoc(volunteerDocRef);

      if (volunteerDocSnap.exists()) {
        setMessage(`Error: Volunteer with NV_ID ${formData.NV_ID} already exists.`);
        setLoading(false);
        return;
      }

      const volunteersRef = collection(db, "Volunteers");
      const qRollNo = query(volunteersRef, where("Roll_No", "==", formData.Roll_No.trim()));
      const rollNoSnapshot = await getDocs(qRollNo);

      if (!rollNoSnapshot.empty) {
        setMessage(`Error: Volunteer with Roll Number ${formData.Roll_No} already exists.`);
        setLoading(false);
        return;
      }

      // Add new volunteer
      const newVolunteerData = {
        ...formData,
        NV_ID: nvId,
        Roll_No: formData.Roll_No.trim(),
        DateJoined: new Date(),
      };
      
      // Use setDoc to use NV_ID as document ID
      await setDoc(volunteerDocRef, newVolunteerData);

      // Ensure NAPs and vLOGs entries exist
      await ensureNapsAndVLogsExist(newVolunteerData.NV_ID, newVolunteerData.Roll_No, newVolunteerData.UNIT);

      setMessage('Volunteer added successfully! Corresponding NAPs/vLOGs entries ensured.');
      setFormData({ // Reset form
        NV_ID: '', Roll_No: '', firstName: '', lastName: '', email: '', phone: '', Branch: '', UNIT: '',
      });
    } catch (error) {
      console.error("Error adding volunteer: ", error);
      setMessage(`Error adding volunteer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card"> {/* Replaces Tailwind's shadow, rounded, bg-white, p-6 etc. */}
      <h2 className="page-title">Add New Volunteer</h2> {/* Replaces text-xl font-bold mb-4 */}
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'message-error' : 'message-success'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-layout"> {/* Replaces space-y-4 or grid classes */}
        <div className="form-grid"> {/* Optional: for two-column layout */}
          <div className="form-group">
            <label htmlFor="NV_ID" className="form-label">NV ID*</label>
            <input type="text" name="NV_ID" id="NV_ID" value={formData.NV_ID} onChange={handleChange} required className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="Roll_No" className="form-label">Roll Number*</label>
            <input type="text" name="Roll_No" id="Roll_No" value={formData.Roll_No} onChange={handleChange} required className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">First Name*</label>
            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="lastName" className="form-label">Last Name*</label>
            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone</label>
            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="Branch" className="form-label">Department (Branch)</label>
            <input type="text" name="Branch" id="Branch" value={formData.Branch} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="UNIT" className="form-label">Sub-Group (Unit)</label>
            <input type="text" name="UNIT" id="UNIT" value={formData.UNIT} onChange={handleChange} className="form-input" />
          </div>
        </div>
        
        <button type="submit" className="btn btn-primary btn-full-width" disabled={loading}>
          {loading ? 'Adding...' : 'Add Volunteer'}
        </button>
      </form>
    </div>
  );
}
