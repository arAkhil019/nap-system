import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
// Import the CSS file at the top of your component
import "../App.css";

export default function SingleNAPAssign() {
  const [formData, setFormData] = useState({
    NV_ID: "",
    Category: "",
    Description: "",
    NAPs: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "Category" && value) {
      // Extract NAP points from the category text
      const categoryText = e.target.options[e.target.selectedIndex].text;
      const pointsMatch = categoryText.match(/\((\d+(?:\.\d+)?)\s*NAP[s]?\)/i);
      const napPoints = pointsMatch ? pointsMatch[1] : "";

      setFormData((prev) => ({
        ...prev,
        [name]: value,
        NAPs: napPoints, // Auto-set the NAP points 
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { NV_ID, Category, NAPs, Description } = formData;
      
      // 1. Get the current log ID from systemConfig
      const configRef = doc(db, "configs", "systemConfig");
      const configDoc = await getDoc(configRef);

      if (!configDoc.exists()) {
        throw new Error("System configuration not found");
      }

      const currLOG = configDoc.data().currLOG;
      if (!currLOG) {
        throw new Error("Log sequence not configured in system");
      }

      // 2. Use the current log ID and prepare next one
      const logId = currLOG;
      const prefix = currLOG.match(/^[A-Za-z]+/)[0]; 
      const numPart = parseInt(currLOG.match(/\d+/)[0], 10);
      const nextLogId = `${prefix}${(numPart + 1).toString().padStart(6, '0')}`;

      // 3. Update the system config with the new log ID
      await updateDoc(configRef, {
        currLOG: nextLogId
      });
      
      // 4. Create a new LOG record
      await addDoc(collection(db, "LOGs"), {
        ...formData,
        Timestamp: new Date(),
        Log_ID: logId,
      });

      // 5. Update vLOGs collection - find or create document for this NV_ID
      const vLogsQuery = query(
        collection(db, "vLOGs"),
        where("NV_ID", "==", NV_ID)
      );
      const vLogsSnap = await getDocs(vLogsQuery);

      if (!vLogsSnap.empty) {
        // User exists in vLOGs, update logs array
        const vLogsDoc = vLogsSnap.docs[0];
        const currentLogs = vLogsDoc.data().logs || [];
        await updateDoc(vLogsDoc.ref, {
          logs: [...currentLogs, logId],
        });
      } else {
        // Create new document in vLOGs
        await addDoc(collection(db, "vLOGs"), {
          NV_ID,
          logs: [logId],
        });
      }
      
      // 6. Update NAPs collection
      const napQuery = query(
        collection(db, "NAPs"),
        where("NV_ID", "==", NV_ID)
      );
      const napSnap = await getDocs(napQuery);
      
      if (!napSnap.empty) {
        // User exists in NAPs, update points
        const napDoc = napSnap.docs[0];
        const data = napDoc.data();
        const categoryValue = parseInt(data[Category] || 0, 10);
        const awarded = parseInt(NAPs, 10);
        const totalNAPs = parseInt(data.TotalNAPs || 0, 10);

        await updateDoc(napDoc.ref, {
          [Category]: categoryValue + awarded,
          TotalNAPs: totalNAPs + awarded,
        });
      } else {
        // Create new document in NAPs
        await addDoc(collection(db, "NAPs"), {
          NV_ID,
          Roll_No: "",
          Unit: "",
          TotalNAPs: parseInt(NAPs),
          [Category]: parseInt(NAPs),
        });
      }

      setMessage("NAP points assigned successfully!");
      setFormData({ NV_ID: "", Category: "", NAPs: "", Description: "" });
    } catch (error) {
      console.error("Error assigning NAPs:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="page-title">Assign NAP Points</h2>

      {message && (
        <div
          className={message.includes("Error") ? "message message-error" : "message message-success"}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">
              NV ID
            </label>
            <input
              type="text"
              name="NV_ID"
              value={formData.NV_ID}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Category
            </label>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Select Category</option>
              <option value="1">
                1 - Attending a Sub-Group Meeting/Discussion (0.5 NAP)
              </option>
              <option value="2">
                2 - Participated in plantation (With proof) (0.5 NAP)
              </option>
              <option value="3">
                3 - Contributed in documentation of event or technical work (1 NAP)
              </option>
              <option value="4">
                4 - Attending a college event by CBIT NSS (1 NAP/hr)
              </option>
              <option value="5">
                5 - Contributed in Photography for coverage of event (2 NAPs)
              </option>
              <option value="6">
                6 - Have come up with ideation of an implementable and
                executable event/activity (2 NAPs)
              </option>
              <option value="7">
                7 - Contributed in preparing a poster designs (2 NAPs)
              </option>
              <option value="8">
                8 - Engaged in Class2Class publicity or any other way of
                publicity activity (2 NAPs)
              </option>
              <option value="9">
                9 - Attending a Case-Study Session(Monthly Activity) (2 NAPs)
              </option>
              <option value="10">10 - Presenting a Case-Study (4 NAPs)</option>
              <option value="11">
                11 - Edited a proper reel on the event/activity (4 NAPs)
              </option>
              <option value="12">
                12 - Attending a Visit to Orphanage/Old Age Home/School (5 NAPs)
              </option>
              <option value="13">
                13 - Have submitted a proper survey under respective Head (5
                NAPs)
              </option>
              <option value="14">
                14 - Participating in a Schwachtha He Seva Activity (6 NAPs)
              </option>
              <option value="15">
                15 - On Submitting a Valid TalesFromTown Story (Verifiable on
                Submission) (6 NAPs)
              </option>
              <option value="16">
                16 - Have donated grocerries or any other basic amenities (8
                NAPs)
              </option>
              <option value="17">
                17 - Have successfully found a Blood Donor for emegency (10
                NAPs)
              </option>
              <option value="18">
                18 - Have Donated Blood to the patient on emergency (20 NAPs)
              </option>
              <option value="19">
                19 - Other social service, youth empowerment, etc related
                activities (Variable)
              </option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              NAP Points
            </label>
            <input
              type="number"
              name="NAPs"
              value={formData.NAPs}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Description
            </label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              required
              rows="3"
              className="form-textarea"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary btn-full ${loading ? "disabled" : ""}`}
          >
            {loading ? (
              <>
                <span className="spinner">⟳</span> Assigning...
              </>
            ) : "Assign NAP Points"}
          </button>
        </div>
      </form>
    </div>
  );
}
