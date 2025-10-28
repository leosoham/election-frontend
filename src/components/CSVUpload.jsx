import React, { useState } from 'react';

const CSVUpload = ({ onVotersAdded, electionContract, isAdmin, disabled }) => {
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['name', 'unique_id', 'wallet_id'];
      const hasRequiredHeaders = requiredHeaders.every(header => 
        headers.some(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === header.replace(/[^a-z0-9]/g, ''))
      );

      if (!hasRequiredHeaders) {
        setError('CSV must contain columns: name, unique_id, wallet_id');
        return;
      }

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 3) {
            data.push({
              name: values[0],
              uniqueId: values[1],
              walletId: values[2]
            });
          }
        }
      }

      setCsvData(data);
      setError('');
    };
    reader.readAsText(file);
  };

  const uploadVoters = async () => {
    if (!csvData.length) {
      setError('No valid data to upload');
      return;
    }

    if (!isAdmin) {
      setError('Only admin can upload voters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const voter of csvData) {
        try {
          // Validate wallet address format
          if (!/^0x[a-fA-F0-9]{40}$/.test(voter.walletId)) {
            console.error(`Invalid wallet address: ${voter.walletId}`);
            errorCount++;
            continue;
          }

          const tx = await electionContract.addVoterData(
            voter.name,
            voter.uniqueId,
            voter.walletId
          );
          await tx.wait();
          successCount++;
        } catch (err) {
          console.error(`Error adding voter ${voter.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully added ${successCount} voters. ${errorCount} failed.`);
        onVotersAdded && onVotersAdded();
      } else {
        setError(`Failed to add any voters. ${errorCount} errors occurred.`);
      }
    } catch (err) {
      setError('Error uploading voters: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeVoterList = async () => {
    if (!isAdmin) {
      setError('Only admin can finalize voter list');
      return;
    }

    setLoading(true);
    try {
      const tx = await electionContract.finalizeVoterList();
      await tx.wait();
      setSuccess('Voter list finalized successfully!');
      onVotersAdded && onVotersAdded();
    } catch (err) {
      setError('Error finalizing voter list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="csv-upload-section">
      <h3>📋 Upload Voter List (CSV)</h3>
      
      <div className="upload-area">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={disabled || loading}
          className="file-input"
        />
        <p className="file-info">
          Upload a CSV file with columns: name, unique_id, wallet_id
        </p>
      </div>

      {csvData.length > 0 && (
        <div className="csv-preview">
          <h4>Preview ({csvData.length} voters):</h4>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unique ID</th>
                  <th>Wallet ID</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((voter, index) => (
                  <tr key={index}>
                    <td>{voter.name}</td>
                    <td>{voter.uniqueId}</td>
                    <td>{voter.walletId.slice(0, 10)}...</td>
                  </tr>
                ))}
                {csvData.length > 5 && (
                  <tr>
                    <td colSpan="3">... and {csvData.length - 5} more</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {csvData.length > 0 && (
        <div className="upload-actions">
          <button
            onClick={uploadVoters}
            disabled={loading || disabled}
            className="action-btn primary"
          >
            {loading ? 'Uploading...' : `Upload ${csvData.length} Voters`}
          </button>
          
          <button
            onClick={finalizeVoterList}
            disabled={loading || disabled}
            className="action-btn"
          >
            Finalize Voter List
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
};

export default CSVUpload;
