"use client";

import { useState } from 'react';

export default function Home() {
  const [documentText, setDocumentText] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [addTextStatus, setAddTextStatus] = useState('');
  const [uploadFileStatus, setUploadFileStatus] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryStatus, setQueryStatus] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [llmAnswer, setLlmAnswer] = useState('');

  // Function to handle adding a document by text
  const handleAddText = async () => {
    if (!documentText.trim()) {
      setAddTextStatus('Please enter text to add.');
      return;
    }

    setAddTextStatus('Adding document...');
    
    try {
      const response = await fetch('/add_document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText }),
      });

      const data = await response.json();
      if (response.ok) {
        setAddTextStatus(`Document added successfully! ID: ${data.id}`);
        setDocumentText('');
      } else {
        setAddTextStatus(`Error: ${data.detail}`);
      }
    } catch (error) {
      console.error('Network or server error:', error);
      setAddTextStatus('Network or server error. Check your backend.');
    }
  };

  // Function to handle adding a document by file upload
  const handleFileUpload = async () => {
    if (!documentFile) {
      setUploadFileStatus('Please select a file to upload.');
      return;
    }

    setUploadFileStatus(`Uploading "${documentFile.name}"...`);

    const formData = new FormData();
    formData.append('file', documentFile);

    try {
      const response = await fetch('/upload_document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadFileStatus(`File "${data.filename}" uploaded successfully! ID: ${data.id}`);
        setDocumentFile(null);
      } else {
        setUploadFileStatus(`Error: ${data.detail}`);
      }
    } catch (error) {
      console.error('Network or server error:', error);
      setUploadFileStatus('Network or server error. Check your backend.');
    }
  };

  // Function to handle querying documents and generating LLM answer
  const handleQuery = async () => {
    if (!queryText.trim()) {
      setQueryStatus('Please enter a query.');
      return;
    }

    setQueryStatus('Searching...');
    setSearchResults([]);
    setLlmAnswer('');

    try {
      const response = await fetch('/generate_answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryText }),
      });

      if (response.ok) {
        const data = await response.json();
        setQueryStatus('');
        setLlmAnswer(data.answer);
        setSearchResults(data.sources.map((source, index) => ({ id: index + 1, text: source, score: 1 })));
      } else {
        setQueryStatus('Error generating answer.');
        setSearchResults([]);
        setLlmAnswer('');
      }
    } catch (error) {
      console.error('Network or server error:', error);
      setQueryStatus('Network or server error. Check your backend.');
      setSearchResults([]);
      setLlmAnswer('');
    }
  };

  return (
    <div className="p-8 flex items-center justify-center min-h-screen bg-gray-100">
      <div className="container w-full p-6 space-y-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800">Mini RAG Application</h1>

        {/* Add Document Section */}
        <div className="bg-white p-6 space-y-4 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700">Add a Document</h2>
          
          {/* Text Input Form */}
          <div className="space-y-2">
            <label htmlFor="documentText" className="block text-sm font-medium text-gray-700">Enter text directly:</label>
            <textarea 
              id="documentText"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" 
              rows="6" 
              placeholder="Enter the document text here..."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
            ></textarea>
            <button 
              onClick={handleAddText}
              className="w-full px-6 py-3 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add Document (Text)
            </button>
            <div className={`mt-2 font-semibold transition duration-300 ease-in-out ${addTextStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {addTextStatus}
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">OR</span>
            </div>
          </div>

          {/* File Upload Form */}
          <div className="space-y-2">
            <label htmlFor="documentFile" className="block text-sm font-medium text-gray-700">Upload a file (.pdf, .txt, .docx):</label>
            <input 
              type="file" 
              id="documentFile"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={(e) => setDocumentFile(e.target.files[0])}
            />
            <button 
              onClick={handleFileUpload}
              className="w-full px-6 py-3 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Upload Document (File)
            </button>
            <div className={`mt-2 font-semibold transition duration-300 ease-in-out ${uploadFileStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {uploadFileStatus}
            </div>
          </div>
        </div>

        {/* Query Section */}
        <div className="bg-white p-6 space-y-4 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700">Query Documents</h2>
          <div className="flex items-center space-x-4">
            <input 
              type="text" 
              id="queryText"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" 
              placeholder="Enter your query here..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <button 
              onClick={handleQuery}
              className="px-6 py-3 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>
          <div className="text-red-600 font-semibold">{queryStatus}</div>
        </div>

        {/* Final Answer Section */}
        <div className="bg-white p-6 space-y-4 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700">LLM Answer</h2>
          <div id="llmAnswer" className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[5rem]">
            {llmAnswer ? <p>{llmAnswer}</p> : <p className="text-gray-500">Your generated answer will appear here...</p>}
          </div>
        </div>
        
        {/* Search Results Section */}
        <div className="bg-white p-6 space-y-4 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700">Source Documents</h2>
          <div id="searchResults" className="space-y-4">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <div key={result.id} className="query-result-item p-4 border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-gray-800 font-semibold">Document {result.id}:</p>
                  <p className="text-sm text-gray-500 mt-2">{result.text}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">Source documents will appear here...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}