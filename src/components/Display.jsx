import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from 'xlsx'; 
import "../App.css";

const categoryLabels = {
  "1": "1 - Sub-Group Meeting",
  "2": "2 - Plantation",
  "3": "3 - Documentation",
  "4": "4 - College Event",
  "5": "5 - Photography",
  "6": "6 - Event Ideation",
  "7": "7 - Poster Design",
  "8": "8 - Publicity",
  "9": "9 - Case Study Session",
  "10": "10 - Case Study Presentation",
  "11": "11 - Reel Editing",
  "12": "12 - Charity Visit",
  "13": "13 - Survey Submission",
  "14": "14 - Swachh Bharat",
  "15": "15 - TalesFromTown",
  "16": "16 - Donations",
  "17": "17 - Blood Donor Finding",
  "18": "18 - Blood Donation",
  "19": "19 - Other Activities"
};

export default function NAPsTable() {
  const [napsData, setNapsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "NV_ID",
    direction: "ascending"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [lastUpdated, setLastUpdated] = useState(null);

  const baseColumns = [
    { key: "NV_ID", label: "Volunteer ID" },
    { key: "Roll_No", label: "Roll Number" },
    { key: "Unit", label: "Unit" },
    { key: "TotalNAPs", label: "Total NAPs" }
  ];

  const fetchNAPsData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Check cache first if not forcing refresh
      const cachedData = sessionStorage.getItem('napsData');
      const cachedTime = sessionStorage.getItem('napsDataTime');
      
      if (!forceRefresh && cachedData && cachedTime) {
        // Use cached data if it's less than 5 minutes old (optional, but good practice)
        // For now, we'll trust the cache until explicit refresh
        setNapsData(JSON.parse(cachedData));
        setLastUpdated(new Date(parseInt(cachedTime)));
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(collection(db, "NAPs"));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update state and cache
      setNapsData(data);
      const now = Date.now();
      setLastUpdated(new Date(now));
      sessionStorage.setItem('napsData', JSON.stringify(data));
      sessionStorage.setItem('napsDataTime', now.toString());
      
    } catch (err) {
      console.error("Error fetching NAPs data:", err);
      setError("Failed to load NAPs data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNAPsData();
  }, []);

  const handleRefresh = () => {
    fetchNAPsData(true);
  };

  const allColumns = React.useMemo(() => {
    const categoryKeys = Object.keys(categoryLabels).sort((a, b) => parseInt(a) - parseInt(b));
    
    return [
      ...baseColumns,
      ...categoryKeys.map(key => ({
        key,
        label: categoryLabels[key]
      }))
    ];
  }, []);


  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); 
  };

  const sortedData = React.useMemo(() => {
    if (!napsData) return [];
    let sortableItems = [...napsData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] === undefined ? (typeof a[sortConfig.key] === 'string' ? '' : -Infinity) : a[sortConfig.key];
        const bValue = b[sortConfig.key] === undefined ? (typeof b[sortConfig.key] === 'string' ? '' : -Infinity) : b[sortConfig.key];
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue);
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }
        if (typeof aValue === 'number') return -1;
        if (typeof bValue === 'number') return 1;
        return 0;
      });
    }
    return sortableItems;
  }, [napsData, sortConfig]);

  const filteredData = React.useMemo(() => {
    setCurrentPage(1); 
    if (!searchTerm.trim()) return sortedData;
    const term = searchTerm.toLowerCase();
    return sortedData.filter(item => {
      const nvIdString = String(item.NV_ID || "").toLowerCase();
      const rollNoString = String(item.Roll_No || "").toLowerCase();
      const unitString = String(item.Unit || "").toLowerCase();
      return nvIdString.includes(term) ||
             rollNoString.includes(term) ||
             unitString.includes(term);
    });
  }, [sortedData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getSortDirectionIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleExportToExcel = () => {
    if (filteredData.length === 0) { 
      alert("No data to export.");
      return;
    }
    const excelHeaders = allColumns.map(col => col.label);
    const excelData = filteredData.map(row => {
      const rowData = {};
      allColumns.forEach(col => {
        rowData[col.label] = row[col.key] !== undefined ? row[col.key] : (typeof row[col.key] === 'number' ? 0 : '');
      });
      return rowData;
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: excelHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NAPs Data");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `NAPs_Data_${date}.xlsx`);
  };

  if (loading) {
    return (
      <div className="card naps-table-loading-error-container"> {/* Added specific class */}
        <h2 className="page-title">NAPs Points Table</h2>
        <div className="naps-table-spinner-container"> {/* Replaces flex justify-center py-8 items-center */}
          <div className="spinner">⟳</div>
          <span className="naps-table-loading-text">Loading data...</span> {/* Replaces ml-2 */}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card naps-table-loading-error-container"> {/* Added specific class */}
        <h2 className="page-title">NAPs Points Table</h2>
        <div className="message message-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card naps-table-component"> {/* Added specific class for overall component styling */}
      <div className="naps-table-header"> {/* Replaces flex justify-between items-center mb-4 */}
        <h2 className="page-title naps-table-title">NAPs Points Table</h2> {/* Replaces mb-0 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            className="btn"
            style={{ backgroundColor: '#6c757d', color: 'white' }}
            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Refresh data'}
          >
            Refresh ⟳
          </button>
          <button
            onClick={handleExportToExcel}
            className="btn btn-primary"
            disabled={filteredData.length === 0}
          >
            Export to Excel
          </button>
        </div>
      </div>
      
      <div className="form-group naps-table-search-bar"> {/* Replaces mb-4, added specific class */}
        <input
          type="text"
          placeholder="Search by Volunteer ID, Roll Number or Unit"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
        />
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {allColumns.map((column) => (
                <th 
                  key={column.key} 
                  onClick={() => requestSort(column.key)}
                  className="naps-table-th" /* Added class for th specific styles */
                >
                  {column.label}{getSortDirectionIndicator(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id}>
                  {allColumns.map((column) => (
                    <td key={`${row.id}-${column.key}`}>
                      {row[column.key] !== undefined ? String(row[column.key]) : "0"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={allColumns.length} className="naps-table-no-data"> {/* Added class */}
                  No data available for the current filter or page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="naps-table-pagination"> {/* Replaces flex justify-between items-center mt-4 */}
        <div className="naps-table-pagination-summary"> {/* Replaces text-sm and inline styles */}
          Showing {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
          {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        {totalPages > 1 && (
          <div className="naps-table-pagination-nav"> {/* Replaces flex */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn btn-secondary naps-table-pagination-button naps-table-pagination-prev" /* Added specific classes, replaces mr-2 and inline styles */
            >
              Previous
            </button>
            <span className="naps-table-pagination-status"> {/* Replaces self-center text-sm and inline styles */}
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="btn btn-secondary naps-table-pagination-button naps-table-pagination-next" /* Added specific classes, replaces ml-2 and inline styles */
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}