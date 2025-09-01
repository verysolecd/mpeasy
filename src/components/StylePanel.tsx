
import React from 'react';

interface StylePanelProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const StylePanel: React.FC<StylePanelProps> = ({ isDarkMode, onToggleDarkMode }) => {
  return (
    <div className="style-panel" style={{ padding: '10px', borderLeft: '1px solid #ccc', width: '250px' }}>
      <h4>Style Controls</h4>
      <div style={{ marginTop: '10px' }}>
        <button onClick={onToggleDarkMode}>
          {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
      </div>
    </div>
  );
};

export default StylePanel;
