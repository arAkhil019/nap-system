import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

export default function MultiNAPsAssign() {
  const [formData, setFormData] = useState({
    nvIdList: "",
    Category: "",
    Description: "",
    NAPs: "",
    prefix: "NV-", // Default prefix for NV_IDs
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

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
    setResults([]);

    try {
      const { nvIdList, Category, NAPs, Description, prefix } = formData;
      
      // Parse NV_ID list (last 3 digits)
      const nvIdSuffixes = nvIdList
        .split('\n')
        .map(id => id.trim())
        .filter(id => id); // Remove empty lines
      
      if (nvIdSuffixes.length === 0) {
        throw new Error("Please enter at least one NV_ID");
      }

      const timestamp = new Date();
      let successCount = 0;
      let errorCount = 0;
      const processingResults = [];

      // Process each NV_ID
      for (const suffix of nvIdSuffixes) {
        try {
          // Create full NV_ID
          const NV_ID = suffix.length <= 3 ? `${prefix}${suffix.padStart(3, '0')}` : suffix;
          const logId = `${NV_ID}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Add to LOGs collection
          await addDoc(collection(db, "LOGs"), {
            NV_ID,
            Category,
            NAPs,
            Description,
            Timestamp: timestamp,
            Log_ID: logId,
          });

          // Update NAPs collection
          const napQuery = query(
            collection(db, "NAPs"),
            where("NV_ID", "==", NV_ID)
          );
          const napSnap = await getDocs(napQuery);
          
          if (!napSnap.empty) {
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
            // Create a new NAP document for this user
            await addDoc(collection(db, "NAPs"), {
              NV_ID,
              Roll_No: "",
              Unit: "",
              TotalNAPs: parseInt(NAPs),
              [Category]: parseInt(NAPs),
            });
          }

          // Update vLOGs collection
          const vLogsQuery = query(
            collection(db, "vLOGs"),
            where("NV_ID", "==", NV_ID)
          );
          const vLogsSnap = await getDocs(vLogsQuery);

          if (!vLogsSnap.empty) {
            const vLogsDoc = vLogsSnap.docs[0];
            const currentLogs = vLogsDoc.data().logs || [];
            await updateDoc(vLogsDoc.ref, {
              logs: [...currentLogs, logId],
            });
          } else {
            await addDoc(collection(db, "vLOGs"), {
              NV_ID,
              logs: [logId],
            });
          }
          
          successCount++;
          processingResults.push({
            NV_ID,
            status: "success",
            message: "NAP points assigned successfully"
          });
        } catch (error) {
          errorCount++;
          processingResults.push({
            NV_ID: suffix,
            status: "error",
            message: error.message
          });
        }
      }

      setResults(processingResults);
      setMessage(`Processed ${successCount} volunteers successfully. ${errorCount} errors.`);
      
      if (successCount > 0) {
        // Only clear form if at least one was successful
        setFormData(prev => ({
          ...prev,
          nvIdList: "",
          Category: "",
          NAPs: "",
          Description: ""
        }));
      }
    } catch (error) {
      console.error("Error assigning NAPs:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Assign NAP Points to Multiple Volunteers</h2>

      {message && (
        <div
          className={`p-3 rounded mb-4 ${
            message.includes("Error")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              NV ID Prefix
            </label>
            <input
              type="text"
              name="prefix"
              value={formData.prefix}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 border"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default prefix for NV IDs (e.g., "NV-"). Will be added to each 3-digit ID.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              NV ID List (Last 3 digits, one per line)
            </label>
            <textarea
              name="nvIdList"
              value={formData.nvIdList}
              onChange={handleChange}
              required
              rows="5"
              placeholder="001
002
003"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 border"
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              Enter each volunteer ID on a new line. For IDs like "NV-001", you can enter just "001" or the full ID.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 border"
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              NAP Points
            </label>
            <input
              type="number"
              name="NAPs"
              value={formData.NAPs}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              required
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2 border"
              placeholder="Enter a description that applies to all selected volunteers"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? "Assigning..." : "Assign NAP Points to All"}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold mb-2">Processing Results:</h3>
          <div className="max-h-60 overflow-y-auto border rounded p-2">
            <ul className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <li key={index} className="py-2">
                  <div className={`flex items-center ${
                    result.status === "success" ? "text-green-700" : "text-red-700"
                  }`}>
                    <span className="font-medium mr-2">{result.NV_ID}:</span> 
                    <span>{result.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}