'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getSTDEnergy, getNewEnergy, getHopfieldWeights, doHopfieldUpdate, doDenseHopfieldUpdate } from './hopfield';

const GRID_SIZE = 8;
const BOX_SIZE = 50;

export default function App() {
  // Dropdown to choose between A-C and A-Z
  const [selection, setSelection] = useState<'A-C' | 'A-G'>('A-C');

  function handleSelectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelection(e.target.value as 'A-C' | 'A-G');
  }
  
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', paddingTop: '20px' }}>
      <GridDrawer selection={selection} />
      

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        maxWidth: 320,
        width: '100%',
        paddingTop: '100px'
      }}>
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Hopfield Demo</h1>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Steps</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
          <li>Draw an A, B, or C on the left grid and hit the update button to converge to the closest letter.</li>
          <li>Switch the range to A-G and try the same process with a different letter.</li>
          <li>Try drawing that letter on the right grid</li>
          <li>See if you get better convergence on the right.</li>
        </ol>

        <label htmlFor="range-dropdown" className="mb-2 text-gray-700 font-medium">Choose range:</label>
        <select
          id="range-dropdown"
          value={selection}
          onChange={handleSelectionChange}
          className="px-4 py-2 border border-gray-300 rounded shadow-sm bg-white"
        >
          <option value="A-C">A-C</option>
          <option value="A-G">A-G</option>
        </select>
      </div>
      <GridDrawerDense selection={selection} />
    </div>
  );
}

export function GridDrawerDense({ selection }: { selection: 'A-C' | 'A-G' }) {
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(-1))
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [weights, setWeights] = useState<number[][] | null>(null);
  const gridRef = useRef(null);

  // Load weights on mount or selection change
  useEffect(() => {
    getHopfieldWeights(selection).then(w => {
      setWeights(w as number[][]);
      // console.log('Weights loaded:', w);
    }).catch(error => {
      console.error('Error loading weights:', error);
    });
  }, [selection]);

  const toggleCell = (row: number, col: number) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = 1;
      return newGrid;
    });
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true);
    toggleCell(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      toggleCell(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearGrid = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(-1)));
  };

  const exportToJSON = () => {
    const jsonString = JSON.stringify(grid, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grid.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleHopfieldUpdate = () => {
    if (!weights) {
      console.error('Weights not loaded yet');
      return;
    }
    const updatedGrid = doDenseHopfieldUpdate(grid);
    setGrid(updatedGrid);
  };
  
  // calculate the energy of the state
  const energy = useMemo(() => {
    return getNewEnergy(grid);
  }, [grid]);

  // Count cells with value 1
  const countOnes = useMemo(() => {
    return grid.flat().filter(cell => cell === 1).length;
  }, [grid]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
          Dense Associative Memory Asynchronous Updates
        </h1>
        <div className="text-center mb-4">
          <span className="text-lg font-semibold text-gray-700">
            Cells with value 1: <span className="text-purple-600">{countOnes}</span>
          </span>
          <div></div>
          <span className="text-lg font-semibold text-gray-700">
            Current Energy of State (cubic): {energy}
          </span>
        </div>
        
        <div className="flex justify-center mb-4">
          <div 
            ref={gridRef}
            className="border-2 border-gray-300"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${BOX_SIZE}px)`,
              gap: '1px',
              backgroundColor: '#e5e7eb'
            }}
          >
          {grid.map((row, rowIdx) => (
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="cursor-crosshair"
                style={{
                  width: `${BOX_SIZE}px`,
                  height: `${BOX_SIZE}px`,
                  backgroundColor: cell === 1 ? '#000000' : '#ffffff',
                }}
                onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
              />
            ))
          ))}
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={clearGrid}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear Grid
          </button>
          <button
            onClick={() => console.log(grid)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Log to Console
          </button>
          <button
            onClick={exportToJSON}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Export to JSON
          </button>
          <button
            onClick={handleHopfieldUpdate}
            disabled={!weights}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update (Row at a time)
          </button>
        </div>
      </div>
    </div>
  );
}

export function GridDrawer({ selection }: { selection: 'A-C' | 'A-G' }) {
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(-1))
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [weights, setWeights] = useState<number[][] | null>(null);
  const gridRef = useRef(null);

  // Load weights on mount or selection change
  useEffect(() => {
    getHopfieldWeights(selection).then(w => {
      setWeights(w as number[][]);
      // console.log('Weights loaded:', w);
    }).catch(error => {
      console.error('Error loading weights:', error);
    });
  }, [selection]);

  const toggleCell = (row: number, col: number) => {
    setGrid(prev => {
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = 1;
      return newGrid;
    });
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true);
    toggleCell(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      toggleCell(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearGrid = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(-1)));
  };

  const exportToJSON = () => {
    const jsonString = JSON.stringify(grid, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grid.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleHopfieldUpdate = () => {
    if (!weights) {
      console.error('Weights not loaded yet');
      return;
    }
    const updatedGrid = doHopfieldUpdate(grid, weights);
    setGrid(updatedGrid);
  };

  // Count cells with value 1
  const countOnes = useMemo(() => {
    return grid.flat().filter(cell => cell === 1).length;
  }, [grid, weights]);

  // calculate the energy of the state
  const energy = useMemo(() => {
    if (!weights) return null;
    return getSTDEnergy(grid, weights);
  }, [grid, weights]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
          Original Hopfield Stochastic Synchronous Updates
        </h1>
        <p className="text-gray-600 mb-4 text-center">
          Click and drag to draw. 
        </p>
        <p className="text-gray-600 mb-4 text-center">
          Draw a letter and converge to my drawing (or not)!
        </p>
        <div className="text-center mb-4">
          <span className="text-lg font-semibold text-gray-700">
            Cells with value 1: <span className="text-purple-600">{countOnes}</span>
          </span>
          <div></div>
          <span className="text-lg font-semibold text-gray-700">
            Current Energy of State: {energy}
          </span>
        </div>
        
        <div className="flex justify-center mb-4">
          <div 
            ref={gridRef}
            className="border-2 border-gray-300"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${BOX_SIZE}px)`,
              gap: '1px',
              backgroundColor: '#e5e7eb'
            }}
          >
          {grid.map((row, rowIdx) => (
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="cursor-crosshair"
                style={{
                  width: `${BOX_SIZE}px`,
                  height: `${BOX_SIZE}px`,
                  backgroundColor: cell === 1 ? '#000000' : '#ffffff',
                }}
                onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
              />
            ))
          ))}
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={clearGrid}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear Grid
          </button>
          <button
            onClick={() => console.log(grid)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Log to Console
          </button>
          <button
            onClick={exportToJSON}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Export to JSON
          </button>
          <button
            onClick={handleHopfieldUpdate}
            disabled={!weights}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update (whole state)
          </button>
        </div>
      </div>
    </div>
  );
}