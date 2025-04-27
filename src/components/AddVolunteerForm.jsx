import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const fields = ['S_No', 'Name', 'Roll_No', 'Club_Designation', 'Role', 'Branch', 'Section', 'Mail', 'Number', 'UNIT', 'Blood_Group', 'Address', 'NV_ID', 'IMG_LINK', 'Paid', 'Barcode'];

export default function AddVolunteerForm() {
  const [formData, setFormData] = useState(Object.fromEntries(fields.map(f => [f, ''])));

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'Volunteers'), {
        ...formData,
        Paid: formData.Paid === 'true'
      });
      alert('Volunteer added!');
    } catch (err) {
      console.error(err);
      alert('Failed to add.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 p-4">
      <h2 className="text-xl font-bold">Add Volunteer</h2>
      {fields.map(field => (
        <input key={field} name={field} placeholder={field} value={formData[field]} onChange={handleChange} className="p-2 border rounded" />
      ))}
      <button type="submit" className="bg-blue-600 text-white p-2 rounded">Submit</button>
    </form>
  );
}
