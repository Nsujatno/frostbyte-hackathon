'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../dashboard/components/Sidebar';

interface ReceiptItem {
  id: string;
  item_name: string;
  price: number;
  carbon_footprint_kg: number;
  impact_level: 'low' | 'medium' | 'high';
  has_alternative: boolean;
  alternative_name: string | null;
  alternative_carbon_kg: number | null;
  carbon_savings_percent: number | null;
  alternative_note: string | null;
}

interface ScanResult {
  receipt_scan_id: string;
  store_name: string;
  scan_date: string;
  total_items: number;
  total_co2_kg: number;
  comparison_metric: string;
  xp_earned: number;
  items: ReceiptItem[];
}

export default function ReceiptScannerPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your receipt...');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedCommitments, setSelectedCommitments] = useState<Set<string>>(new Set());
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Fetch recent scans and stats on mount
  useEffect(() => {
    fetchRecentScans();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('http://localhost:8000/missions/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Loading messages rotation
  useEffect(() => {
    if (isScanning) {
      const messages = [
        'Analyzing your receipt...',
        'Reading items...',
        'Calculating carbon footprint...',
        'Finding better alternatives...'
      ];
      let index = 0;
      
      const interval = setInterval(() => {
        index = (index + 1) % messages.length;
        setLoadingMessage(messages[index]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const fetchRecentScans = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('http://localhost:8000/receipts/history?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentScans(data.receipts || []);
      }
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions or try uploading a photo instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob and create preview URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            
            // Create a File object from the blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleStartScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setLoadingMessage('Analyzing your receipt...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];

        const token = localStorage.getItem('supabase_token');
        const response = await fetch('http://localhost:8000/receipts/scan-and-analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            image_base64: base64Data
          })
        });

        if (!response.ok) {
          throw new Error('Failed to scan receipt');
        }

        const data = await response.json();
        setScanResult(data);
        setIsScanning(false);
        
        // Refresh recent scans and stats
        fetchRecentScans();
        fetchStats();
      };

      reader.onerror = () => {
        setIsScanning(false);
        alert('Error reading file');
      };
    } catch (error) {
      console.error('Error scanning receipt:', error);
      setIsScanning(false);
      alert('Failed to scan receipt. Please try again.');
    }
  };

  const toggleCommitment = (itemId: string) => {
    const newCommitments = new Set(selectedCommitments);
    if (newCommitments.has(itemId)) {
      newCommitments.delete(itemId);
    } else {
      newCommitments.add(itemId);
    }
    setSelectedCommitments(newCommitments);
  };

  const handleSaveCommitments = async () => {
    if (!scanResult || selectedCommitments.size === 0) return;

    try {
      const token = localStorage.getItem('supabase_token');
      const commitments = Array.from(selectedCommitments).map(itemId => {
        const item = scanResult.items.find(i => i.id === itemId);
        return {
          item_id: itemId,
          commitment_text: `Try ${item?.alternative_name} instead of ${item?.item_name}`
        };
      });

      const response = await fetch('http://localhost:8000/receipts/commitments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receipt_scan_id: scanResult.receipt_scan_id,
          commitments
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCommitments(new Set());
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving commitments:', error);
      alert('Failed to save commitments');
    }
  };

  const toggleExpandScan = async (scanId: string) => {
    if (expandedScanId === scanId) {
      setExpandedScanId(null);
    } else {
      setExpandedScanId(scanId);
      // Fetch detailed scan info if needed
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F4F7F5' }}>
      <Sidebar 
        activeRoute="receipt-scanner"
        stats={stats ? {
          co2Saved: stats.impact.total_co2_saved,
          xpEarned: stats.xp.total_xp,
          missionsCompleted: stats.impact.total_missions_completed,
          streakDays: stats.impact.current_streak_days,
          treesPlanted: stats.equivalents.trees_planted,
          milesNotDriven: stats.equivalents.miles_not_driven,
          ledHours: stats.equivalents.led_hours
        } : undefined}
      />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Take a Photo</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 px-6 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#2E5D3F', color: '#FFFFFF' }}
              >
                📸 Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 py-3 px-6 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
          
          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-[#1F3A2E] mb-2">Receipt Scanner</h1>
          <p className="text-gray-600 mb-8">
            Upload a receipt to see the carbon footprint of your purchases
          </p>

          {!scanResult ? (
            <>
              {!previewUrl ? (
                <div className="grid grid-cols-2 gap-6">
                  {/* Upload File Option */}
                  <div
                    className="border-2 border-dashed rounded-2xl p-12 text-center bg-white hover:border-opacity-80 transition-all cursor-pointer"
                    style={{ borderColor: '#2E5D3F' }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <div className="space-y-4">
                      <div className="text-6xl">📄</div>
                      <div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">
                          Upload Receipt
                        </p>
                        <p className="text-sm text-gray-500">
                          Drag & drop or click to browse
                        </p>
                      </div>
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Take Photo Option */}
                  <div
                    className="border-2 border-dashed rounded-2xl p-12 text-center bg-white hover:border-opacity-80 transition-all cursor-pointer"
                    style={{ borderColor: '#2E5D3F' }}
                    onClick={openCamera}
                  >
                    <div className="space-y-4">
                      <div className="text-6xl">📸</div>
                      <div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">
                          Take Photo
                        </p>
                        <p className="text-sm text-gray-500">
                          Use your camera
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-2xl p-12 text-center bg-white" style={{ borderColor: '#2E5D3F' }}>
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-96 mx-auto rounded-lg shadow-lg"
                    />
                    <p className="text-sm text-gray-500">{selectedFile?.name || 'Camera capture'}</p>
                  </div>
                </div>
              )}

              {previewUrl && (
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isScanning ? 'Scanning...' : 'Start Scan'}
                </button>
              )}

              {isScanning && (
                <div className="mt-8 bg-white rounded-2xl p-8 shadow-lg">
                  <div className="text-center space-y-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
                    <p className="text-xl font-semibold text-gray-800">{loadingMessage}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {/* Receipt Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-6">
                  {previewUrl && (
                    <img src={previewUrl} alt="Receipt" className="w-24 h-24 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {scanResult.store_name || 'Receipt Scanned'}
                    </h2>
                    <p className="text-gray-600 mb-4">{scanResult.scan_date || new Date().toLocaleDateString()}</p>
                    <div className="flex gap-8 items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Items</p>
                        <p className="text-2xl font-bold text-gray-900">{scanResult.total_items}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Carbon Impact</p>
                        <p className="text-3xl font-bold text-emerald-700">
                          {scanResult.total_co2_kg} kg CO2
                        </p>
                      </div>
                      <div className="bg-lime-100 px-4 py-2 rounded-lg">
                        <p className="text-lime-800 font-semibold">+{scanResult.xp_earned} XP</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                      That's equivalent to {scanResult.comparison_metric}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">Items Breakdown</h3>
                {scanResult.items && scanResult.items.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-5 shadow border-l-4 ${
                      item.impact_level === 'high' ? 'border-red-500' :
                      item.impact_level === 'medium' ? 'border-yellow-500' : 'border-green-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900">{item.item_name}</h4>
                        <p className="text-gray-600">${item.price?.toFixed(2) || 'N/A'}</p>
                        <p className="mt-2 text-lg font-semibold">
                          <span className={`${
                            item.impact_level === 'high' ? 'text-red-600' : 
                            item.impact_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {item.carbon_footprint_kg} kg CO2
                          </span>
                          {item.impact_level === 'high' && <span className="ml-2">⚠️</span>}
                          {item.impact_level === 'low' && <span className="ml-2">✓</span>}
                        </p>
                      </div>

                      {item.has_alternative && item.alternative_name && (
                        <div className="ml-6 bg-emerald-50 rounded-lg p-4 max-w-md">
                          <div className="flex items-start gap-2 mb-2">
                            <span>💡</span>
                            <p className="font-semibold text-emerald-900">Better Alternative</p>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1">{item.alternative_name}</p>
                          <p className="text-sm text-green-700 mb-1">{item.alternative_carbon_kg} kg CO2 ✓</p>
                          <p className="text-sm font-semibold text-emerald-800">
                            Save: {item.carbon_savings_percent}% carbon
                          </p>
                          <p className="text-xs text-gray-600 mt-2">{item.alternative_note}</p>
                          <button
                            onClick={() => toggleCommitment(item.id)}
                            className={`mt-3 w-full py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                              selectedCommitments.has(item.id)
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-emerald-700 border-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {selectedCommitments.has(item.id) ? '✓ Committed' : "I'll try this next time"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Commitment Section */}
              {selectedCommitments.size > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Commit to Alternatives</h3>
                  <p className="text-gray-600 mb-4">
                    You've selected {selectedCommitments.size} alternative{selectedCommitments.size !== 1 ? 's' : ''}
                  </p>
                  {selectedCommitments.size >= 3 && (
                    <p className="text-emerald-700 font-semibold mb-4">
                      🎉 Complete 3+ commitments = +50 bonus XP!
                    </p>
                  )}
                  <button
                    onClick={handleSaveCommitments}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all"
                  >
                    Save My Commitments
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setScanResult(null);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setSelectedCommitments(new Set());
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all"
              >
                Scan Another Receipt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Recent Scans */}
      <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Scans</h2>
        
        {recentScans.length > 0 ? (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <div key={scan.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{scan.store_name || 'Receipt'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpandScan(scan.id)}
                    className="text-emerald-600 text-sm font-medium"
                  >
                    {expandedScanId === scan.id ? 'Hide' : 'View Details'}
                  </button>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">CO2:</p>
                    <p className="font-bold text-emerald-700">{scan.total_co2_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Items:</p>
                    <p className="font-bold text-gray-900">{scan.total_items}</p>
                  </div>
                </div>
                {expandedScanId === scan.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">{scan.comparison_metric}</p>
                    <p className="text-xs text-emerald-700 mt-1">+{scan.xp_earned} XP earned</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-6">
              <img
                src="/Online Groceries-pana.svg"
                alt="Start scanning"
                className="w-64 mx-auto"
              />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Start Tracking Your Shopping Impact
            </h3>
            <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
              <li>📊 See the carbon footprint of your purchases</li>
              <li>💡 Get personalized lower-impact alternatives</li>
              <li>⚡ Earn XP for every scan</li>
              <li>🎯 Build sustainable shopping habits</li>
            </ul>
            <p className="text-xs text-gray-500">
              <a href="https://storyset.com/business" className="underline" target="_blank" rel="noopener noreferrer">
                Business illustrations by Storyset
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
